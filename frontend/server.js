/**
 * VoiceTrace — Express backend server
 *
 * Entirely inside frontend/ so you only need to work in one folder.
 *
 * Routes:
 *   POST /api/analyze          → file upload → ffmpeg → whisper-cli → result
 *   POST /api/analyze/youtube  → yt-dlp → ffmpeg → whisper-cli → result
 *
 * Dependencies: express, multer, uuid, cors (all in package.json)
 * System deps:  ffmpeg, yt-dlp, whisper-cli (all via Homebrew)
 */

import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { execFile, execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

const TMP_DIR = path.join(__dirname, '.tmp')
fs.mkdirSync(TMP_DIR, { recursive: true })

const MODEL_PATH = path.join(__dirname, 'models', 'ggml-base.bin')
const WHISPER_BIN = 'whisper-cli'

// ── multer for file uploads (500 MB limit) ─────────────────────────────────
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 500 * 1024 * 1024 },
})

// ── helpers ────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    console.log(`  ▶ ${cmd} ${args.join(' ').slice(0, 120)}`)
    execFile(cmd, args, { maxBuffer: 50 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) {
        console.error(`  ✗ ${cmd} failed:`, stderr || err.message)
        return reject(new Error(stderr || err.message))
      }
      resolve(stdout)
    })
  })
}

/** Convert any media file to 16kHz mono WAV (whisper-cli requirement) */
async function toWav(inputPath, wavPath) {
  await run('ffmpeg', [
    '-y', '-i', inputPath,
    '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
    wavPath,
  ])
  return wavPath
}

/** Download audio from YouTube URL to WAV */
async function downloadYoutube(url, wavPath) {
  const tmpAudio = wavPath.replace('.wav', '.ytdl.%(ext)s')
  // yt-dlp downloads best audio, we then pipe through ffmpeg to get wav
  await run('yt-dlp', [
    '--no-playlist',
    '-f', 'bestaudio/best',
    '-x',
    '--audio-format', 'wav',
    '--postprocessor-args', '-ar 16000 -ac 1',
    '-o', tmpAudio,
    url,
  ])

  // yt-dlp outputs with the resolved extension; find it
  const dir = path.dirname(wavPath)
  const base = path.basename(wavPath, '.wav')
  const candidates = fs.readdirSync(dir).filter(f => f.startsWith(base + '.ytdl'))
  if (candidates.length === 0) throw new Error('yt-dlp did not produce output')

  const dlPath = path.join(dir, candidates[0])
  // If it's already wav, just rename; otherwise convert
  if (dlPath !== wavPath) {
    if (dlPath.endsWith('.wav')) {
      fs.renameSync(dlPath, wavPath)
    } else {
      await toWav(dlPath, wavPath)
      fs.unlinkSync(dlPath)
    }
  }
  return wavPath
}

/** Parse whisper-cli SRT output into segments */
function parseSrt(srt) {
  const segments = []
  const blocks = srt.trim().split(/\n\n+/)
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    )
    if (!timeMatch) continue
    const start = +timeMatch[1]*3600 + +timeMatch[2]*60 + +timeMatch[3] + +timeMatch[4]/1000
    const end   = +timeMatch[5]*3600 + +timeMatch[6]*60 + +timeMatch[7] + +timeMatch[8]/1000
    const text  = lines.slice(2).join(' ').trim()
    if (text) segments.push({ start: +start.toFixed(3), end: +end.toFixed(3), text })
  }
  return segments
}

/** Run whisper-cli on a WAV file and return structured result */
async function transcribe(wavPath, language = 'auto') {
  const srtPath = wavPath + '.srt'

  const args = [
    '-m', MODEL_PATH,
    '-f', wavPath,
    '-osrt',
    '-of', wavPath,  // output file prefix (whisper adds .srt)
    '--no-prints',
  ]
  if (language !== 'auto') {
    args.push('-l', language)
  }

  console.log('  ⏳ Running whisper-cli …')
  const startTime = Date.now()
  await run(WHISPER_BIN, args)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`  ✓ Whisper done in ${elapsed}s`)

  // Read SRT output
  const srtContent = fs.readFileSync(srtPath, 'utf-8')
  const segments = parseSrt(srtContent)
  const fullText = segments.map(s => s.text).join(' ')

  // Get audio duration
  let duration = 0
  try {
    const probe = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${wavPath}"`,
      { encoding: 'utf-8' }
    ).trim()
    duration = parseFloat(probe) || 0
  } catch { /* ignore */ }

  // Detect language from whisper output (fallback)
  const detectedLanguage = language !== 'auto' ? language : 'auto'

  return {
    language: detectedLanguage,
    duration: Math.round(duration * 100) / 100,
    full_text: fullText,
    segments,
    srt_content: srtContent,
  }
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* ok */ }
}

// ── Routes ────────────────────────────────────────────────────────────────

/** POST /api/analyze — file upload */
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  const jobId = randomUUID().replace(/-/g, '')
  const jobDir = path.join(TMP_DIR, jobId)
  fs.mkdirSync(jobDir, { recursive: true })

  try {
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded' })
    const language = req.body?.language || 'auto'

    console.log(`\n[${jobId}] File upload: ${req.file.originalname} (${(req.file.size/1e6).toFixed(1)} MB)`)

    // Move uploaded file to job dir
    const ext = path.extname(req.file.originalname || '.mp4')
    const rawPath = path.join(jobDir, `input${ext}`)
    fs.renameSync(req.file.path, rawPath)

    // Convert to WAV
    const wavPath = path.join(jobDir, 'audio.wav')
    console.log(`[${jobId}] Extracting audio …`)
    await toWav(rawPath, wavPath)

    // Transcribe
    console.log(`[${jobId}] Transcribing …`)
    const result = await transcribe(wavPath, language)

    res.json({ job_id: jobId, ...result })
  } catch (err) {
    console.error(`[${jobId}] Error:`, err.message)
    res.status(500).json({ detail: err.message })
  } finally {
    cleanup(jobDir)
  }
})

/** POST /api/analyze/youtube — YouTube URL */
app.post('/api/analyze/youtube', async (req, res) => {
  const jobId = randomUUID().replace(/-/g, '')
  const jobDir = path.join(TMP_DIR, jobId)
  fs.mkdirSync(jobDir, { recursive: true })

  try {
    const { url, language = 'auto' } = req.body || {}
    if (!url) return res.status(400).json({ detail: 'Missing url field' })

    console.log(`\n[${jobId}] YouTube: ${url}`)

    // Download
    const wavPath = path.join(jobDir, 'audio.wav')
    console.log(`[${jobId}] Downloading audio from YouTube …`)
    await downloadYoutube(url, wavPath)

    if (!fs.existsSync(wavPath)) {
      throw new Error('YouTube download did not produce a WAV file')
    }
    console.log(`[${jobId}] Downloaded: ${(fs.statSync(wavPath).size/1e6).toFixed(1)} MB`)

    // Transcribe
    console.log(`[${jobId}] Transcribing …`)
    const result = await transcribe(wavPath, language)

    res.json({ job_id: jobId, ...result })
  } catch (err) {
    console.error(`[${jobId}] Error:`, err.message)
    res.status(500).json({ detail: err.message })
  } finally {
    cleanup(jobDir)
  }
})

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: fs.existsSync(MODEL_PATH) ? 'loaded' : 'missing' })
})

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n🎤 VoiceTrace server running on http://localhost:${PORT}`)
  console.log(`   Model: ${MODEL_PATH}`)
  console.log(`   Model exists: ${fs.existsSync(MODEL_PATH)}`)
  console.log(`   Temp dir: ${TMP_DIR}\n`)
})

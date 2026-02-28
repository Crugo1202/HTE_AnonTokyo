/**
 * VoiceTrace — Express backend server
 *
 * Entirely inside frontend/ so you only need to work in one folder.
 *
 * Routes:
 *   POST /api/analyze          → file upload → ffmpeg → whisper-cli → result
 *   POST /api/analyze/youtube  → yt-dlp → ffmpeg → whisper-cli → result
 *   POST /api/tts              → MiniMax TTS speech synthesis
 *   GET  /api/tts/voices       → Available TTS voices
 *   POST /api/video/generate   → MiniMax Hailuo video generation
 *   GET  /api/video/status/:id → Query video task status
 *
 * Dependencies: express, multer, cors, dotenv (all in package.json)
 * System deps:  ffmpeg, yt-dlp, whisper-cli (all via Homebrew)
 */

import 'dotenv/config'
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
app.use(express.json({ limit: '50mb' }))

// ── MiniMax API configuration ──────────────────────────────────────────────
// NOTE: sk-cp- (Coding Plan) keys use the GLOBAL endpoint  api.minimax.io
//       sk-api- keys use the CN domestic endpoint api.minimaxi.com
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-m2SNifDQZHRZXIkHjHQakxYVXi2pCiDWhqG8fMQoZJg5oJkp-eoUoWMm9xB8bW7GUuNVSXn3Xdu9p3Prkn68InYYFlRphv1n-jUkq6KIPV6j27vyPsM_lsA'
const MINIMAX_BASE = 'https://api.minimax.io/v1'

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

// ── MiniMax TTS (Text-to-Speech) ──────────────────────────────────────────

/** POST /api/tts — Generate voice audio from text using MiniMax Speech API */
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice_id = 'male-qn-qingse', speed = 1, emotion = 'neutral', language_boost = 'auto' } = req.body || {}
    if (!text) return res.status(400).json({ detail: 'Missing text field' })
    if (text.length > 10000) return res.status(400).json({ detail: 'Text exceeds 10000 character limit' })

    console.log(`\n[TTS] Generating speech (${text.length} chars, voice: ${voice_id}) …`)

    const response = await fetch(`${MINIMAX_BASE}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-02-hd',
        text,
        stream: false,
        voice_setting: { voice_id, speed, vol: 1, pitch: 0, emotion },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
        language_boost,
        output_format: 'url',
      }),
    })

    const data = await response.json()

    if (data.base_resp?.status_code !== 0) {
      console.error('[TTS] API error:', data.base_resp)
      return res.status(502).json({ detail: data.base_resp?.status_msg || 'TTS API error' })
    }

    console.log(`[TTS] ✓ Generated ${data.extra_info?.audio_length}ms audio`)
    res.json({
      audio_url: data.data?.audio,
      duration_ms: data.extra_info?.audio_length || 0,
      sample_rate: data.extra_info?.audio_sample_rate || 32000,
      word_count: data.extra_info?.word_count || 0,
      format: data.extra_info?.audio_format || 'mp3',
    })
  } catch (err) {
    console.error('[TTS] Error:', err.message)
    res.status(500).json({ detail: err.message })
  }
})

/** GET /api/tts/voices — Return available TTS voices */
app.get('/api/tts/voices', (_req, res) => {
  res.json({
    voices: [
      { id: 'male-qn-qingse', name: 'Qingse (Male)', lang: 'zh' },
      { id: 'male-qn-jingying', name: 'Jingying (Male)', lang: 'zh' },
      { id: 'male-qn-badao', name: 'Badao (Male)', lang: 'zh' },
      { id: 'male-qn-daxuesheng', name: 'Student (Male)', lang: 'zh' },
      { id: 'female-shaonv', name: 'Shaonv (Female)', lang: 'zh' },
      { id: 'female-yujie', name: 'Yujie (Female)', lang: 'zh' },
      { id: 'female-chengshu', name: 'Chengshu (Female)', lang: 'zh' },
      { id: 'female-tianmei', name: 'Tianmei (Female)', lang: 'zh' },
      { id: 'presenter_male', name: 'Presenter (Male)', lang: 'en' },
      { id: 'presenter_female', name: 'Presenter (Female)', lang: 'en' },
      { id: 'audiobook_male_1', name: 'Audiobook (Male)', lang: 'en' },
      { id: 'audiobook_female_1', name: 'Audiobook (Female)', lang: 'en' },
    ],
    emotions: ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'],
  })
})

// ── MiniMax Video Generation ──────────────────────────────────────────────

/** POST /api/video/generate — Create video generation task */
app.post('/api/video/generate', async (req, res) => {
  try {
    const { prompt, duration = 6, resolution = '768P', model = 'T2V-01' } = req.body || {}
    if (!prompt) return res.status(400).json({ detail: 'Missing prompt field' })

    console.log(`\n[Video] Creating generation task (${prompt.slice(0, 80)}…)`)

    const response = await fetch(`${MINIMAX_BASE}/video_generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, duration, resolution }),
    })

    const data = await response.json()

    if (data.base_resp?.status_code !== 0) {
      console.error('[Video] API error:', data.base_resp)
      return res.status(502).json({ detail: data.base_resp?.status_msg || 'Video API error' })
    }

    console.log(`[Video] ✓ Task created: ${data.task_id}`)
    res.json({ task_id: data.task_id })
  } catch (err) {
    console.error('[Video] Error:', err.message)
    res.status(500).json({ detail: err.message })
  }
})

/** GET /api/video/status/:taskId — Query video generation task status */
app.get('/api/video/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const response = await fetch(`${MINIMAX_BASE}/query/video_generation?task_id=${taskId}`, {
      headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
    })

    const data = await response.json()

    if (data.base_resp?.status_code !== 0) {
      return res.status(502).json({ detail: data.base_resp?.status_msg || 'Query API error' })
    }

    const result = {
      task_id: data.task_id,
      status: data.status,
      file_id: data.file_id || null,
      video_width: data.video_width || null,
      video_height: data.video_height || null,
    }

    // If success, also fetch download URL
    if (data.status === 'Success' && data.file_id) {
      try {
        const dlRes = await fetch(`${MINIMAX_BASE}/files/retrieve?file_id=${data.file_id}`, {
          headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
        })
        const dlData = await dlRes.json()
        if (dlData.file?.download_url) {
          result.download_url = dlData.file.download_url
        }
      } catch { /* download URL fetch failed, client can retry */ }
    }

    console.log(`[Video] Status ${taskId}: ${data.status}`)
    res.json(result)
  } catch (err) {
    console.error('[Video] Status error:', err.message)
    res.status(500).json({ detail: err.message })
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

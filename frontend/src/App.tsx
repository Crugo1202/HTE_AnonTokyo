import { useState } from 'react'
import { useTheme } from './hooks/useTheme'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import ProgressBar from './components/ProgressBar'
import ResultView from './components/ResultView'
import { transcribeFile, transcribeYoutube } from './services/api'
import type { InputMode, ProgressState, TranscriptResult } from './types'

const IDLE_PROGRESS: ProgressState = { status: 'idle', percent: 0, message: '' }

export default function App() {
  const { theme, toggle } = useTheme()

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [language, setLanguage] = useState('auto')

  // Job state
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS)
  const [result, setResult] = useState<TranscriptResult | null>(null)

  const isProcessing =
    progress.status !== 'idle' &&
    progress.status !== 'done' &&
    progress.status !== 'error'

  const handleSubmit = async () => {
    setResult(null)

    try {
      if (inputMode === 'upload' && file) {
        setProgress({ status: 'uploading', percent: 5, message: 'Uploading file…' })

        const data = await transcribeFile({
          file,
          language,
          onProgress: pct => {
            if (pct < 100) {
              setProgress({ status: 'uploading', percent: Math.round(pct * 0.35), message: 'Uploading file…' })
            } else {
              setProgress({ status: 'extracting', percent: 40, message: 'Extracting audio track…' })
              // Simulate extracting → transcribing stages  
              setTimeout(() => {
                setProgress({ status: 'transcribing', percent: 65, message: 'Transcribing with AI…' })
              }, 800)
            }
          },
        })

        setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
        setResult(data)
      } else if (inputMode === 'youtube' && youtubeUrl.trim()) {
        setProgress({ status: 'uploading', percent: 10, message: 'Fetching YouTube video…' })

        setTimeout(() => setProgress({ status: 'extracting', percent: 35, message: 'Extracting audio…' }), 1200)
        setTimeout(() => setProgress({ status: 'transcribing', percent: 60, message: 'Transcribing with AI…' }), 3000)

        const data = await transcribeYoutube({ url: youtubeUrl.trim(), language })

        setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
        setResult(data)
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      setProgress({ status: 'error', percent: 0, message })
    }
  }

  const handleReset = () => {
    setProgress(IDLE_PROGRESS)
    setResult(null)
    setFile(null)
    setYoutubeUrl('')
  }

  return (
    <div className="app-wrapper">
      <Header theme={theme} onToggle={toggle} />

      <main className="main-content">
        {/* Hero */}
        <section className="hero">
          <div className="hero-eyebrow">✦ Powered by AI</div>
          <h1>
            Turn any video into<br />
            <span>accurate text</span>
          </h1>
          <p className="hero-desc">
            Upload a video file or paste a YouTube link — we'll extract the audio
            and transcribe it in seconds. Download as&nbsp;.txt, .srt, or&nbsp;.json.
          </p>
        </section>

        {/* Input card — hidden when showing results */}
        {!result && (
          <div className="glass-card">
            <UploadSection
              inputMode={inputMode}
              onModeChange={setInputMode}
              file={file}
              onFileChange={setFile}
              youtubeUrl={youtubeUrl}
              onYoutubeUrlChange={setYoutubeUrl}
              language={language}
              onLanguageChange={setLanguage}
              onSubmit={handleSubmit}
              isDisabled={isProcessing}
            />
          </div>
        )}

        {/* Progress */}
        {progress.status !== 'idle' && !result && (
          <ProgressBar progress={progress} />
        )}

        {/* Results */}
        {result && (
          <ResultView result={result} onReset={handleReset} />
        )}
      </main>

      <footer className="footer">
        VoiceTrace — HTE AnonTokyo &nbsp;·&nbsp; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

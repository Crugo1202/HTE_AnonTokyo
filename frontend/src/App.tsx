/**
 * VoiceTrace Main Application Component
 * 
 * Core application component that orchestrates:
 * - Transcription workflow (file upload / YouTube URL → whisper-cli)
 * - Voice Report generation (MiniMax TTS)
 * - Concept Video generation (MiniMax Hailuo)
 * - Tab-based navigation between features
 */
import { useState } from 'react'
import { LayoutDashboard, Mic, Volume2, Clapperboard } from 'lucide-react'
import { useTheme } from './hooks/useTheme'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import UploadSection from './components/UploadSection'
import ProgressBar from './components/ProgressBar'
import ResultView from './components/ResultView'
import VoiceReport from './components/VoiceReport'
import VideoGenerator from './components/VideoGenerator'
import AnalysisResultView from './components/AnalysisResultView'
import { transcribeFile, transcribeYoutube, fullAnalysisFile, fullAnalysisYoutube } from './services/api'
import type { AppTab, AnalysisMode, InputMode, ProgressState, TranscriptResult, FullAnalysisResult } from './types'


/** Default idle state for progress indicator */
const IDLE_PROGRESS: ProgressState = { status: 'idle', percent: 0, message: '' }

const TABS: { key: AppTab; label: string; icon: typeof Mic }[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'transcribe',   label: 'Transcribe',   icon: Mic },
  { key: 'voice-report', label: 'Voice Report',  icon: Volume2 },
  { key: 'video-gen',    label: 'Video Gen',     icon: Clapperboard },
]

export default function App() {
  const { theme, toggle } = useTheme()

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')

  // ── Transcription State ───────────────────────────────────────────────────
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('transcribe')
  const [usePlaceholder, setUsePlaceholder] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [language, setLanguage] = useState('auto')
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS)
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null)
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null)

  const isProcessing =
    progress.status !== 'idle' &&
    progress.status !== 'done' &&
    progress.status !== 'error'

  /** Handle transcription/analysis submission */
  const handleSubmit = async () => {
    setTranscriptResult(null)
    setAnalysisResult(null)
    try {
      if (analysisMode === 'full-analysis') {
        // Full AI analysis mode
        if (inputMode === 'upload' && file) {
          setProgress({ status: 'uploading', percent: 5, message: 'Uploading file…' })
          const data = await fullAnalysisFile({
            file, language, usePlaceholder,
            onProgress: pct => setProgress({ status: 'analyzing', percent: Math.round(pct * 0.4), message: 'Uploading…' }),
          })
          setProgress({ status: 'done', percent: 100, message: 'Analysis complete!' })
          setAnalysisResult(data)
        } else if (inputMode === 'youtube' && youtubeUrl.trim()) {
          setProgress({ status: 'analyzing', percent: 20, message: 'Fetching & analysing video…' })
          const data = await fullAnalysisYoutube({ url: youtubeUrl.trim(), language, usePlaceholder })
          setProgress({ status: 'done', percent: 100, message: 'Analysis complete!' })
          setAnalysisResult(data)
        }
      } else {
        // Transcribe-only mode
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
                setTimeout(() => {
                  setProgress({ status: 'transcribing', percent: 65, message: 'Transcribing with AI…' })
                }, 800)
              }
            },
          })
          setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
          setTranscriptResult(data)
        } else if (inputMode === 'youtube' && youtubeUrl.trim()) {
          setProgress({ status: 'uploading', percent: 10, message: 'Fetching YouTube video…' })
          setTimeout(() => setProgress({ status: 'extracting', percent: 35, message: 'Extracting audio…' }), 1200)
          setTimeout(() => setProgress({ status: 'transcribing', percent: 60, message: 'Transcribing with AI…' }), 3000)
          const data = await transcribeYoutube({ url: youtubeUrl.trim(), language })
          setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
          setTranscriptResult(data)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setProgress({ status: 'error', percent: 0, message })
    }
  }

  /** Reset transcription state */
  const handleReset = () => {
    setProgress(IDLE_PROGRESS)
    setTranscriptResult(null)
    setAnalysisResult(null)
    setFile(null)
    setYoutubeUrl('')
  }

  return (
    <div className="app-wrapper">
      <Header theme={theme} onToggle={toggle} />

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <nav className="tab-nav">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {/* ─── Tab: Dashboard ─────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <Dashboard onNavigate={(tab) => setActiveTab(tab as AppTab)} />
        )}

        {/* ─── Tab: Transcribe ────────────────────────────────────────── */}
        {activeTab === 'transcribe' && (
          <>
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

            {!transcriptResult && !analysisResult && (
              <div className="glass-card">
                <UploadSection
                  analysisMode={analysisMode}
                  onAnalysisModeChange={setAnalysisMode}
                  usePlaceholder={usePlaceholder}
                  onUsePlaceholderChange={setUsePlaceholder}
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

            {progress.status !== 'idle' && !transcriptResult && !analysisResult && (
              <ProgressBar progress={progress} />
            )}

            {analysisResult && (
              <AnalysisResultView result={analysisResult} onReset={handleReset} />
            )}

            {transcriptResult && (
              <ResultView result={transcriptResult} onReset={handleReset} />
            )}
          </>
        )}

        {/* ─── Tab: Voice Report (MiniMax TTS) ────────────────────────── */}
        {activeTab === 'voice-report' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🔊 MiniMax Speech AI</div>
              <h1>Voice Feedback Report</h1>
              <p className="hero-desc">
                Convert your transcript or any text into natural, expressive speech.
                Choose a voice, emotion, and speed — powered by MiniMax TTS.
              </p>
            </section>
            <div className="glass-card">
              <VoiceReport transcriptText={transcriptResult?.full_text || ''} />
            </div>
          </>
        )}

        {/* ─── Tab: Video Generation (MiniMax Hailuo) ─────────────────── */}
        {activeTab === 'video-gen' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🎬 MiniMax Hailuo AI</div>
              <h1>Concept Video Generator</h1>
              <p className="hero-desc">
                Describe a concept and our AI will generate a short explanation video.
                Perfect for when complex topics need visual reinforcement.
              </p>
            </section>
            <div className="glass-card">
              <VideoGenerator />
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        VoiceTrace — HTE AnonTokyo &nbsp;·&nbsp; Powered by MiniMax &nbsp;·&nbsp; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

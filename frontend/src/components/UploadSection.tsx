/**
 * Upload Section Component
 * 
 * Provides dual-mode input interface for transcription:
 * - File upload mode: drag-and-drop and file picker with format validation
 * - YouTube URL mode: paste YouTube link for direct transcription
 * - Language selection dropdown for over 10 languages
 * - Form submission handling with client-side validation
 */
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { UploadCloud, FileVideo, Youtube, Info, Sparkles, Eye, FileText } from 'lucide-react'
import type { AnalysisMode, InputMode } from '../types'

interface UploadSectionProps {
  analysisMode: AnalysisMode
  onAnalysisModeChange: (m: AnalysisMode) => void
  inputMode: InputMode
  onModeChange: (m: InputMode) => void
  file: File | null
  onFileChange: (f: File | null) => void
  youtubeUrl: string
  onYoutubeUrlChange: (v: string) => void
  language: string
  onLanguageChange: (v: string) => void
  usePlaceholder: boolean
  onUsePlaceholderChange: (v: boolean) => void
  onSubmit: () => void
  isDisabled: boolean
}

/**
 * Supported languages for transcription
 * Includes auto-detection and common languages used in video content
 */
const LANGUAGES = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
]

/**
 * Convert bytes to human-readable file size format
 * Displays KB for files < 1 MB, otherwise shows MB
 */
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadSection({
  analysisMode,
  onAnalysisModeChange,
  inputMode,
  onModeChange,
  file,
  onFileChange,
  youtubeUrl,
  onYoutubeUrlChange,
  language,
  onLanguageChange,
  usePlaceholder,
  onUsePlaceholderChange,
  onSubmit,
  isDisabled,
}: UploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFileChange(dropped)
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onFileChange(f)
  }

  const canSubmit =
    !isDisabled &&
    (inputMode === 'upload' ? file !== null : youtubeUrl.trim().length > 0)

  return (
    <>
      <div style={{ padding: '1.5rem 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="tab-bar">
          <button
            className={`tab-btn ${analysisMode === 'full-analysis' ? 'active' : ''}`}
            onClick={() => onAnalysisModeChange('full-analysis')}
          >
            <Eye />
            Full Analysis
          </button>
          <button
            className={`tab-btn ${analysisMode === 'transcribe' ? 'active' : ''}`}
            onClick={() => onAnalysisModeChange('transcribe')}
          >
            <FileText />
            Transcribe Only
          </button>
        </div>

        {analysisMode === 'full-analysis' && (
          <div className="yt-hint" style={{ justifyContent: 'center' }}>
            <Info size={12} />
            Body language analysis + rubric evaluation + transcription
          </div>
        )}

        <div className="tab-bar">
          <button
            className={`tab-btn ${inputMode === 'upload' ? 'active' : ''}`}
            onClick={() => onModeChange('upload')}
          >
            <UploadCloud />
            Upload File
          </button>
          <button
            className={`tab-btn ${inputMode === 'youtube' ? 'active' : ''}`}
            onClick={() => onModeChange('youtube')}
          >
            <Youtube />
            YouTube URL
          </button>
        </div>
      </div>

      {inputMode === 'upload' && (
        <div className="upload-section">
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <div className="drop-icon">
              <UploadCloud />
            </div>
            <h3>Drop your video or audio here</h3>
            <p>or click to browse — max 500 MB</p>
            <div className="file-badges">
              {['.mp4', '.mov', '.mkv', '.avi', '.mp3', '.wav', '.m4a', '.webm'].map(ext => (
                <span key={ext} className="file-badge">{ext}</span>
              ))}
            </div>
          </div>

          {file && (
            <div className="selected-file">
              <FileVideo />
              <span className="selected-file-name">{file.name}</span>
              <span className="selected-file-size">{formatBytes(file.size)}</span>
            </div>
          )}
        </div>
      )}

      {inputMode === 'youtube' && (
        <div className="yt-section">
          <div className="input-group">
            <Youtube className="yt-icon" />
            <input
              type="url"
              className="yt-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => onYoutubeUrlChange(e.target.value)}
            />
          </div>
          <div className="yt-hint">
            <Info size={12} />
            Paste a public YouTube video URL. Private/age-restricted videos are not supported.
          </div>
        </div>
      )}

      <div className="options-row">
        <div className="field-group">
          <label className="field-label">Language</label>
          <select
            className="select-input"
            value={language}
            onChange={e => onLanguageChange(e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {analysisMode === 'full-analysis' && (
          <div className="field-group" style={{ flex: 'none', minWidth: 'auto' }}>
            <label className="field-label">Data Source</label>
            <label className="toggle-label">
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={!usePlaceholder}
                onChange={e => onUsePlaceholderChange(!e.target.checked)}
              />
              <span className="toggle-text">
                {usePlaceholder ? 'Demo data' : 'Live analysis'}
              </span>
            </label>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit}
        >
          <Sparkles />
          {analysisMode === 'full-analysis' ? 'Start Analysis' : 'Start Transcription'}
        </button>
      </div>
    </>
  )
}

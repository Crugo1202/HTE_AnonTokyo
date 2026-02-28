/**
 * Result View Component
 * 
 * Displays transcription results with multiple view modes:
 * - Full transcript text view
 * - Timestamped segments with timeline
 * - SRT subtitle format preview
 * - Download options for each format
 * - Metadata: duration, language, word count
 * - Reset button to start new transcription
 */
import { useState } from 'react'
import {
  FileText,
  Clock,
  Globe,
  Download,
  RotateCcw,
  CheckCircle,
  AlignLeft,
  List,
} from 'lucide-react'
import type { TranscriptResult } from '../types'

interface ResultViewProps {
  /** Complete transcription result from API */
  result: TranscriptResult
  /** Callback to reset application and start new transcription */
  onReset: () => void
}

/** Available views for displaying transcription results */
type ViewTab = 'text' | 'segments' | 'srt'

/**
 * Format duration in seconds to human-readable format (e.g., "2m 45s")
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

/**
 * Format absolute timestamp in seconds to HH:MM:SS format
 * Omits hours if less than 1 hour (shows MM:SS format)
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Trigger a file download using Blob and URL API
 * @param content - File content string
 * @param filename - Desired filename for download
 * @param mime - MIME type (e.g., 'text/plain', 'text/srt')
 */
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultView({ result, onReset }: ResultViewProps) {
  /** Currently active result view tab */
  const [activeTab, setActiveTab] = useState<ViewTab>('text')

  /** Calculate word count for display in metadata */
  const wordCount = result.full_text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="glass-card result-section">
      {/* Header */}
      <div className="result-header">
        <div className="result-title">
          <CheckCircle />
          Transcription Complete
        </div>
        <div className="result-meta">
          <span className="meta-chip">
            <Globe /> {result.language.toUpperCase()}
          </span>
          <span className="meta-chip">
            <Clock /> {formatDuration(result.duration)}
          </span>
          <span className="meta-chip">
            <FileText /> {wordCount.toLocaleString()} words
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlignLeft size={13} /> Full Text
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <List size={13} /> Segments ({result.segments.length})
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'srt' ? 'active' : ''}`}
          onClick={() => setActiveTab('srt')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={13} /> SRT Preview
          </span>
        </button>
      </div>

      {/* Text view */}
      {activeTab === 'text' && (
        <div className="transcript-box">{result.full_text}</div>
      )}

      {/* Segments view */}
      {activeTab === 'segments' && (
        <div className="segments-list">
          {result.segments.map((seg, i) => (
            <div className="segment-row" key={i}>
              <span className="segment-time">{formatTime(seg.start)}</span>
              <span className="segment-time" style={{ opacity: 0.55 }}>
                {formatTime(seg.end)}
              </span>
              <span className="segment-text">{seg.text.trim()}</span>
            </div>
          ))}
        </div>
      )}

      {/* SRT view */}
      {activeTab === 'srt' && (
        <div className="transcript-box" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
          {result.srt_content}
        </div>
      )}

      {/* Download buttons */}
      <div className="download-row">
        <button
          className="btn-download"
          onClick={() => downloadBlob(result.full_text, 'transcript.txt', 'text/plain')}
        >
          <Download /> Download .txt
        </button>
        <button
          className="btn-download"
          onClick={() => downloadBlob(result.srt_content, 'transcript.srt', 'text/plain')}
        >
          <Download /> Download .srt
        </button>
        <button
          className="btn-download"
          onClick={() =>
            downloadBlob(
              JSON.stringify(result, null, 2),
              'transcript.json',
              'application/json',
            )
          }
        >
          <Download /> Download .json
        </button>
        <button className="btn-reset" onClick={onReset}>
          <RotateCcw /> New Transcription
        </button>
      </div>
    </div>
  )
}

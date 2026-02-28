/**
 * Video Generator Component
 *
 * Creates AI-generated explanation videos via MiniMax Hailuo video API.
 * Features:
 *   - Text prompt input with camera direction hints
 *   - Duration & resolution options
 *   - Async task polling with status display
 *   - Inline video player when ready
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Video, Loader2, Play, ExternalLink, RefreshCw, Clapperboard } from 'lucide-react'
import { generateVideo, getVideoStatus } from '../services/api'
import type { VideoGenResult, VideoStatus } from '../types'

interface VideoGeneratorProps {
  /** Optional pre-filled prompt from transcript analysis */
  suggestedPrompt?: string
}

const STATUS_LABELS: Record<VideoStatus, string> = {
  Preparing:  'Preparing…',
  Queueing:   'In queue…',
  Processing: 'Generating video…',
  Success:    'Video ready!',
  Fail:       'Generation failed',
}

const STATUS_PROGRESS: Record<VideoStatus, number> = {
  Preparing:  10,
  Queueing:   25,
  Processing: 60,
  Success:    100,
  Fail:       0,
}

export default function VideoGenerator({ suggestedPrompt = '' }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState(suggestedPrompt)
  const [duration, setDuration] = useState<6 | 10>(6)
  const [resolution, setResolution] = useState<'768P' | '1080P'>('768P')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<VideoGenResult | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync external prompt
  useEffect(() => {
    if (suggestedPrompt) setPrompt(suggestedPrompt)
  }, [suggestedPrompt])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollStatus = useCallback((tid: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await getVideoStatus(tid)
        setStatus(res)
        if (res.status === 'Success' || res.status === 'Fail') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // keep polling
      }
    }, 5000)
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setStatus(null)
    setTaskId(null)

    try {
      const { task_id } = await generateVideo({
        prompt,
        duration,
        resolution,
        model: 'T2V-01',
      })
      setTaskId(task_id)
      setStatus({ task_id, status: 'Preparing', file_id: null, download_url: null })
      pollStatus(task_id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Video generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setTaskId(null)
    setStatus(null)
    setError(null)
  }

  const currentStatus = status?.status
  const progressPct = currentStatus ? STATUS_PROGRESS[currentStatus] : 0
  const isGenerating = taskId && currentStatus && !['Success', 'Fail'].includes(currentStatus)

  return (
    <div className="video-gen">
      <div className="vg-header">
        <div className="vg-icon"><Clapperboard size={24} /></div>
        <div>
          <h2 className="vg-title">Concept Video Generator</h2>
          <p className="vg-subtitle">Create AI explanation videos with MiniMax Hailuo</p>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="vg-section">
        <label className="vg-label">Video description</label>
        <textarea
          className="vg-textarea"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the concept video you want, e.g.: A clear whiteboard animation explaining photosynthesis…"
          rows={4}
          maxLength={2000}
        />
        <div className="vg-hint">
          Tip: Use camera directions like [Push in], [Pull back], [Pan left] for cinematic control
        </div>
      </div>

      {/* Options Row */}
      <div className="vg-options">
        <div className="vg-option-group">
          <label className="vg-label">Duration</label>
          <div className="vg-toggle">
            <button
              className={`vg-toggle-btn ${duration === 6 ? 'active' : ''}`}
              onClick={() => setDuration(6)}
            >6s</button>
            <button
              className={`vg-toggle-btn ${duration === 10 ? 'active' : ''}`}
              onClick={() => setDuration(10)}
            >10s</button>
          </div>
        </div>
        <div className="vg-option-group">
          <label className="vg-label">Resolution</label>
          <div className="vg-toggle">
            <button
              className={`vg-toggle-btn ${resolution === '768P' ? 'active' : ''}`}
              onClick={() => setResolution('768P')}
            >768P</button>
            <button
              className={`vg-toggle-btn ${resolution === '1080P' ? 'active' : ''}`}
              onClick={() => setResolution('1080P')}
            >1080P</button>
          </div>
        </div>
      </div>

      {/* Generate / Reset Buttons */}
      {!taskId ? (
        <button
          className="vg-generate-btn"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? (
            <><Loader2 size={18} className="spin" /> Submitting…</>
          ) : (
            <><Video size={18} /> Generate Video</>
          )}
        </button>
      ) : (
        <button className="vg-reset-btn" onClick={handleReset}>
          <RefreshCw size={18} /> New Video
        </button>
      )}

      {/* Error */}
      {error && <div className="vg-error">{error}</div>}

      {/* Progress */}
      {isGenerating && (
        <div className="vg-progress glass-card">
          <div className="vg-progress-header">
            <Loader2 size={18} className="spin" />
            <span>{currentStatus ? STATUS_LABELS[currentStatus] : 'Starting…'}</span>
          </div>
          <div className="vg-progress-track">
            <div className="vg-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="vg-progress-hint">
            Video generation typically takes 2-5 minutes. Please wait…
          </p>
        </div>
      )}

      {/* Failure */}
      {currentStatus === 'Fail' && (
        <div className="vg-error">
          Video generation failed. Please try a different prompt or try again later.
        </div>
      )}

      {/* Success — Video Player */}
      {currentStatus === 'Success' && status?.download_url && (
        <div className="vg-result glass-card">
          <video
            className="vg-video"
            src={status.download_url}
            controls
            autoPlay
            muted
          />
          <div className="vg-result-info">
            <span className="vg-result-label">
              <Play size={16} /> Video generated successfully
            </span>
            {status.video_width && status.video_height && (
              <span className="vg-result-meta">
                {status.video_width}×{status.video_height}
              </span>
            )}
            <a
              className="vg-download-link"
              href={status.download_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} /> Open in new tab
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Progress Bar Component
 * 
 * Displays transcription progress with:
 * - Real-time percentage indicator
 * - Step-by-step status visualization
 * - User-friendly status messages
 * - Error state with alert display
 */
import { AlertCircle } from 'lucide-react'
import type { ProgressState, JobStatus } from '../types'

interface ProgressBarProps {
  /** Current progress state including status, percentage, and message */
  progress: ProgressState
}

/** Steps shown in progress indicator */
const STEPS: { status: JobStatus; label: string }[] = [
  { status: 'uploading', label: 'Upload' },
  { status: 'extracting', label: 'Extract Audio' },
  { status: 'transcribing', label: 'Transcribe' },
  { status: 'done', label: 'Done' },
]

/** Ordering of job stages for progress visualization */
const STATUS_ORDER: JobStatus[] = ['uploading', 'extracting', 'transcribing', 'done']

/**
 * Determine step state relative to current job status
 * @returns 'done' if step is completed, 'active' if current step, 'idle' if not yet reached
 */
function stepState(stepStatus: JobStatus, currentStatus: JobStatus): 'done' | 'active' | 'idle' {
  const stepIdx = STATUS_ORDER.indexOf(stepStatus)
  const currIdx = STATUS_ORDER.indexOf(currentStatus)
  if (currIdx > stepIdx) return 'done'
  if (currIdx === stepIdx) return 'active'
  return 'idle'
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const { status, percent, message } = progress

  if (status === 'idle') return null

  return (
    <div className="glass-card progress-section">
      {status === 'error' ? (
        <div className="error-banner">
          <AlertCircle />
          {message}
        </div>
      ) : (
        <>
          <div className="progress-header">
            <span className="progress-label">{message}</span>
            <span className="progress-pct">{percent}%</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="progress-steps">
            {STEPS.map(step => {
              const state = stepState(step.status, status)
              return (
                <div key={step.status} className={`progress-step ${state}`}>
                  <div className={`step-dot ${state === 'active' ? 'active' : ''}`} />
                  {step.label}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

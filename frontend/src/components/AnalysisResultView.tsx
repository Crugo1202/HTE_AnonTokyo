import { useState } from 'react'
import {
  CheckCircle,
  RotateCcw,
  Download,
  Eye,
  BookOpen,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import type { FullAnalysisResult } from '../types'
import { generateFeedback } from '../services/api'

interface Props {
  result: FullAnalysisResult
  onReset: () => void
}

type ActiveTab = 'body-language' | 'rubric' | 'transcript' | 'feedback'

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AnalysisResultView({ result, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('body-language')
  const [expandedSegment, setExpandedSegment] = useState<number | null>(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackModel, setFeedbackModel] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const segments = result.body_language?.segments ?? []

  async function handleGenerateFeedback() {
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const res = await generateFeedback({
        transcript: result.transcript?.full_text,
        body_language_report: result.body_language?.combined_report,
        rubric_evaluation: result.rubric_evaluation ?? undefined,
      })
      setFeedback(res.feedback)
      setFeedbackModel(res.model)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to generate feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="glass-card result-section">
      <div className="result-header">
        <div className="result-title">
          <CheckCircle />
          Analysis Complete
        </div>
        <div className="result-meta">
          {result.is_placeholder && (
            <span className="meta-chip placeholder-chip">
              <Info size={11} /> Demo Data
            </span>
          )}
          <span className="meta-chip">
            <Eye size={11} /> {segments.length} segments
          </span>
          <span className="meta-chip">
            <Activity size={11} /> {result.body_language?.model ?? 'N/A'}
          </span>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`view-tab ${activeTab === 'body-language' ? 'active' : ''}`}
          onClick={() => setActiveTab('body-language')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Eye size={13} /> Body Language
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'rubric' ? 'active' : ''}`}
          onClick={() => setActiveTab('rubric')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <BookOpen size={13} /> Rubric Evaluation
          </span>
        </button>
        {result.transcript && (
          <button
            className={`view-tab ${activeTab === 'transcript' ? 'active' : ''}`}
            onClick={() => setActiveTab('transcript')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity size={13} /> Transcript
            </span>
          </button>
        )}
        <button
          className={`view-tab ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MessageSquare size={13} /> AI Feedback
            {feedback && <CheckCircle size={11} style={{ color: 'var(--accent)' }} />}
          </span>
        </button>
      </div>

      {activeTab === 'body-language' && (
        <div className="analysis-segments">
          {segments.map((seg) => {
            const isExpanded = expandedSegment === seg.segment
            return (
              <div
                key={seg.segment}
                className={`analysis-segment ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  className="segment-header-btn"
                  onClick={() =>
                    setExpandedSegment(isExpanded ? null : seg.segment)
                  }
                >
                  <span className="segment-label">
                    Segment {seg.segment}
                    <span className="segment-range">
                      {seg.start} &ndash; {seg.end}
                    </span>
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isExpanded && (
                  <div className="segment-body">
                    <div className="markdown-content">{seg.markdown}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'rubric' && (
        <div className="transcript-box" style={{ maxHeight: '500px' }}>
          {result.rubric_evaluation ?? 'No rubric evaluation available.'}
        </div>
      )}

      {activeTab === 'transcript' && result.transcript && (
        <div className="transcript-box">
          {result.transcript.full_text}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="feedback-panel">
          {!feedback && !feedbackLoading && (
            <div className="feedback-prompt">
              <p className="feedback-prompt-text">
                Generate personalized, actionable feedback for the teacher based on all
                available analysis data — transcript, body language, and rubric evaluation.
              </p>
              <button
                className="btn-generate-feedback"
                onClick={handleGenerateFeedback}
                disabled={feedbackLoading}
              >
                <MessageSquare size={16} />
                Generate AI Feedback
              </button>
            </div>
          )}
          {feedbackLoading && (
            <div className="feedback-loading">
              <Loader2 size={24} className="spinner" />
              <p>Generating personalized feedback&hellip;</p>
              <p className="feedback-loading-sub">This may take a minute.</p>
            </div>
          )}
          {feedbackError && (
            <div className="feedback-error">
              <p>{feedbackError}</p>
              <button className="btn-generate-feedback" onClick={handleGenerateFeedback}>
                Retry
              </button>
            </div>
          )}
          {feedback && (
            <>
              {feedbackModel && (
                <div className="feedback-meta">
                  <span className="meta-chip"><Activity size={11} /> {feedbackModel}</span>
                </div>
              )}
              <div className="transcript-box" style={{ maxHeight: '600px', whiteSpace: 'pre-wrap' }}>
                {feedback}
              </div>
            </>
          )}
        </div>
      )}

      <div className="download-row">
        {result.body_language && (
          <button
            className="btn-download"
            onClick={() =>
              downloadBlob(
                result.body_language!.combined_report,
                'body_language_report.md',
                'text/markdown',
              )
            }
          >
            <Download /> Body Language .md
          </button>
        )}
        {result.rubric_evaluation && (
          <button
            className="btn-download"
            onClick={() =>
              downloadBlob(
                result.rubric_evaluation!,
                'rubric_evaluation.md',
                'text/markdown',
              )
            }
          >
            <Download /> Rubric .md
          </button>
        )}
        {feedback && (
          <button
            className="btn-download"
            onClick={() =>
              downloadBlob(feedback, 'teacher_feedback.md', 'text/markdown')
            }
          >
            <Download /> Feedback .md
          </button>
        )}
        <button
          className="btn-download"
          onClick={() =>
            downloadBlob(
              JSON.stringify(result, null, 2),
              'full_analysis.json',
              'application/json',
            )
          }
        >
          <Download /> Full .json
        </button>
        <button className="btn-reset" onClick={onReset}>
          <RotateCcw /> New Analysis
        </button>
      </div>
    </div>
  )
}

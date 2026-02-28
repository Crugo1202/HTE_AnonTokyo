import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react'
import {
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  ClipboardList,
  MessageSquare,
  Clock,
  RefreshCw,
  Loader2,
  GraduationCap,
  Mic,
  Eye,
  Sparkles,
  ChevronRight,
  Video,
} from 'lucide-react'
import type { DashboardData, AnalysisSummary } from '../types'
import { fetchDashboard } from '../services/api'
import { LESSON_OBSERVATION_CRITERIA } from '../data/lessonObservationCriteria'

interface Props {
  analyses: AnalysisSummary[]
  selectedAnalysisId: string | null
  onSelectAnalysis: (id: string) => void
  onNavigate: (tab: string) => void
}

/** Derive stable mock scores from analysis id (0–100) */
function mockScoresFromId(id: string): { bodyScore: number; audioScore: number } {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return {
    bodyScore: 62 + (h % 35),
    audioScore: 60 + ((h + 7) % 38),
  }
}

/** Parse overall score from rubric markdown (average of "Score: N") or return fallback */
function parseOverallFromRubric(rubric: string | undefined): number {
  if (!rubric) return 78
  const matches = rubric.matchAll(/Score:\s*(\d+)/gi)
  const scores: number[] = []
  for (const m of matches) scores.push(parseInt(m[1], 10))
  if (scores.length === 0) return 78
  const sum = scores.reduce((a, b) => a + b, 0)
  return Math.round((sum / scores.length) * (100 / 4)) // assume 4-point scale -> 0–100
}

/** Stable mock score 1–4 for a criterion given analysis id */
function mockCriterionScore(analysisId: string, criterionKey: string): number {
  const h = (analysisId + criterionKey).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 1 + (Math.abs(h) % 4)
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const CAPABILITY_META: Record<string, { icon: typeof Mic; label: string; tab: string }> = {
  'transcription':          { icon: Mic,           label: 'Transcription',           tab: 'transcribe' },
  'body-language-analysis': { icon: Eye,           label: 'Body Language Analysis',  tab: 'transcribe' },
  'full-analysis':          { icon: GraduationCap, label: 'Full Lesson Analysis',    tab: 'transcribe' },
  'ai-feedback':            { icon: MessageSquare, label: 'AI Teacher Feedback',     tab: 'transcribe' },
}

function formatVideoLabel(source: string): string {
  if (source.startsWith('http')) return source.length > 45 ? source.slice(0, 42) + '…' : source
  return source.length > 35 ? source.slice(0, 32) + '…' : source
}

type ChartMetricTab = 'lesson' | 'audio' | 'body' | 'overall'

const CHART_METRIC_TABS: { key: ChartMetricTab; label: string }[] = [
  { key: 'lesson', label: 'Lesson score' },
  { key: 'audio', label: 'Audio score' },
  { key: 'body', label: 'Body language score' },
  { key: 'overall', label: 'Overall score' },
]

export default function Dashboard({
  analyses,
  selectedAnalysisId,
  onSelectAnalysis,
  onNavigate,
}: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [chartHoverId, setChartHoverId] = useState<string | null>(null)
  const [chartMetricTab, setChartMetricTab] = useState<ChartMetricTab>('overall')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(320)

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setChartWidth(el.offsetWidth))
    ro.observe(el)
    setChartWidth(el.offsetWidth)
    return () => ro.disconnect()
  }, [])

  const sortedAnalyses = useMemo(
    () => [...analyses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [analyses],
  )
  const chartData = useMemo(
    () =>
      sortedAnalyses.map((a, i) => {
        const mock = mockScoresFromId(a.id)
        const lessonScore = parseOverallFromRubric(a.result.rubric_evaluation)
        return {
          id: a.id,
          date: new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          fullDate: a.createdAt,
          lessonScore,
          audioScore: mock.audioScore,
          bodyScore: mock.bodyScore,
          overallScore: a.overallScore ?? 70 + (a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 25),
          isLatest: i === sortedAnalyses.length - 1,
        }
      }),
    [sortedAnalyses],
  )

  const chartSize = useMemo(() => ({ width: chartWidth, height: 220, margin: { top: 16, right: 16, bottom: 28, left: 36 } }), [chartWidth])
  const chartPlot = useMemo(() => {
    const { width, height, margin } = chartSize
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom
    const scoreKey = chartMetricTab === 'lesson' ? 'lessonScore' : chartMetricTab === 'audio' ? 'audioScore' : chartMetricTab === 'body' ? 'bodyScore' : 'overallScore'
    const scores = chartData.map(d => d[scoreKey])
    if (chartData.length === 0 || scores.length === 0) return { points: [] as { x: number; y: number; id: string; score: number; fullDate: string; date: string; isLatest: boolean }[], plotWidth: 0, plotHeight: 0, margin, minScore: 0, maxScore: 100 }
    const minScore = 0
    const maxScore = 100
    const scoreRange = maxScore - minScore || 1
    const points = chartData.map((d, i) => {
      const score = d[scoreKey]
      return {
        ...d,
        score,
        x: margin.left + (chartData.length === 1 ? plotWidth / 2 : (i / (chartData.length - 1)) * plotWidth),
        y: margin.top + plotHeight - ((score - minScore) / scoreRange) * plotHeight,
      }
    })
    return { points, plotWidth, plotHeight, margin, minScore, maxScore }
  }, [chartData, chartSize, chartMetricTab])
  const selectedSummary = useMemo(
    () => (selectedAnalysisId ? analyses.find(a => a.id === selectedAnalysisId) : sortedAnalyses[sortedAnalyses.length - 1]),
    [analyses, selectedAnalysisId, sortedAnalyses],
  )
  const displayScores = useMemo(
    () => (selectedSummary ? mockScoresFromId(selectedSummary.id) : null),
    [selectedSummary],
  )
  const rubricTableRows = useMemo(() => {
    if (!selectedSummary) return []
    return LESSON_OBSERVATION_CRITERIA.map(c => ({
      ...c,
      score: mockCriterionScore(selectedSummary!.id, c.key),
    }))
  }, [selectedSummary])

  const rubricOverallFromTable = useMemo(() => {
    if (rubricTableRows.length === 0) return null
    const avg = rubricTableRows.reduce((s, r) => s + r.score, 0) / rubricTableRows.length
    return Math.round(avg * 10) / 10
  }, [rubricTableRows])

  const rubricOverall100 = useMemo(() => {
    if (rubricOverallFromTable == null) return null
    return Math.round(((rubricOverallFromTable - 1) / 3) * 100)
  }, [rubricOverallFromTable])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchDashboard()
      setData(d)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const configuredCount = data?.services.filter(s => s.configured).length ?? 0
  const totalServices = data?.services.length ?? 0

  return (
    <div className="dashboard">
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="db-header">
        <div>
          <h2 className="db-title">
            <GraduationCap size={22} />
            System Dashboard
          </h2>
          <p className="db-subtitle">
            Live service status &amp; session activity
          </p>
        </div>
        <div className="db-header-right">
          {data && (
            <span className="db-version">v{data.version}</span>
          )}
          <button
            className="db-refresh-btn"
            onClick={load}
            disabled={loading}
            title="Refresh"
          >
            {loading
              ? <Loader2 size={15} className="db-spinner" />
              : <RefreshCw size={15} />
            }
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="db-stats-grid">
        <div className="db-stat-card">
          <div className="db-stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
            <Mic size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value">{data?.stats.transcriptions ?? '—'}</span>
            <span className="db-stat-label">Transcriptions</span>
          </div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <ClipboardList size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value">{data?.stats.full_analyses ?? '—'}</span>
            <span className="db-stat-label">Full Analyses</span>
          </div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <MessageSquare size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value">{data?.stats.feedback_generated ?? '—'}</span>
            <span className="db-stat-label">Feedback Reports</span>
          </div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
            <Clock size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value">
              {data ? formatUptime(data.stats.uptime_seconds) : '—'}
            </span>
            <span className="db-stat-label">Server Uptime</span>
          </div>
        </div>
      </div>

      <div className="db-two-col">
        {/* ── Services ─────────────────────────────────────────── */}
        <div className="glass-card db-panel">
          <h3 className="db-panel-title">
            <Cpu size={16} /> Services
            <span className={`db-service-summary ${configuredCount === totalServices ? 'all-ok' : 'partial'}`}>
              {configuredCount}/{totalServices} configured
            </span>
          </h3>

          {loading && !data && (
            <div className="db-loading-row">
              <Loader2 size={16} className="db-spinner" /> Loading…
            </div>
          )}

          <ul className="db-service-list">
            {data?.services.map(svc => (
              <li key={svc.name} className="db-service-item">
                <span className="db-service-dot">
                  {svc.configured
                    ? <CheckCircle2 size={16} className="db-ok" />
                    : <XCircle size={16} className="db-err" />
                  }
                </span>
                <span className="db-service-label">{svc.label}</span>
                <span className={`db-service-badge ${svc.configured ? 'ok' : 'missing'}`}>
                  {svc.configured ? 'Ready' : 'Not configured'}
                </span>
              </li>
            ))}
          </ul>

          {data && (
            <p className="db-refresh-note">
              Last refreshed {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* ── Capabilities ─────────────────────────────────────── */}
        <div className="glass-card db-panel">
          <h3 className="db-panel-title">
            <Activity size={16} /> Active Capabilities
          </h3>

          {data?.capabilities.length === 0 && (
            <p className="db-empty">
              No services are configured. Add API keys to enable features.
            </p>
          )}

          <ul className="db-cap-list">
            {data?.capabilities.map(cap => {
              const meta = CAPABILITY_META[cap]
              if (!meta) return null
              const Icon = meta.icon
              return (
                <li key={cap} className="db-cap-item">
                  <Icon size={15} className="db-cap-icon" />
                  <span>{meta.label}</span>
                  <CheckCircle2 size={13} className="db-ok" style={{ marginLeft: 'auto' }} />
                </li>
              )
            })}
          </ul>

          {/* Quick actions */}
          {data && data.capabilities.length > 0 && (
            <div className="db-quick-actions">
              <p className="db-panel-subtitle">Quick start</p>
              <button
                className="db-action-btn"
                onClick={() => onNavigate('transcribe')}
              >
                <Sparkles size={14} />
                {data.capabilities.includes('full-analysis')
                  ? 'Run Full Analysis'
                  : 'Transcribe a Lesson'
                }
                <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Teaching analysis (left: graph + list; right: scores + rubric) ── */}
      {analyses.length >= 0 && (
        <div className="db-teaching-section">
          <div className="db-teaching-left">
            <div className="glass-card db-teaching-chart-wrap" ref={chartContainerRef}>
              <h3 className="db-panel-title">Teaching score over time</h3>
              <div className="db-teaching-chart">
                <svg
                  width="100%"
                  height={220}
                  viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  onMouseLeave={() => setChartHoverId(null)}
                >
                  {chartPlot.points.length > 0 && (
                    <>
                      {/* Y axis ticks */}
                      {[0, 25, 50, 75, 100].map(v => {
                        const y = chartPlot.margin.top + chartPlot.plotHeight - ((v - (chartPlot.minScore ?? 0)) / ((chartPlot.maxScore ?? 100) - (chartPlot.minScore ?? 0))) * chartPlot.plotHeight
                        return (
                          <g key={v}>
                            <line x1={chartPlot.margin.left} y1={y} x2={chartPlot.margin.left + chartPlot.plotWidth} y2={y} stroke="var(--border)" strokeDasharray="2" strokeOpacity={0.5} />
                            <text x={chartPlot.margin.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--text-muted)">{v}</text>
                          </g>
                        )
                      })}
                      {/* Line */}
                      {chartPlot.points.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="var(--accent-primary, #6366f1)"
                          strokeWidth={2}
                          points={chartPlot.points.map(p => `${p.x},${p.y}`).join(' ')}
                        />
                      )}
                      {/* Points: invisible larger hit area + visible dot */}
                      {chartPlot.points.map(p => {
                        const isHighlight = p.isLatest || p.id === selectedAnalysisId || p.id === chartHoverId
                        return (
                          <g
                            key={p.id}
                            onMouseEnter={() => setChartHoverId(p.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHighlight ? 6 : 3}
                              fill={p.id === selectedAnalysisId && !p.isLatest ? 'var(--accent-secondary, #8b5cf6)' : 'var(--accent-primary, #6366f1)'}
                              stroke="var(--surface)"
                              strokeWidth={isHighlight ? 2 : 0}
                            />
                          </g>
                        )
                      })}
                      {/* X labels (month and day only, no year) */}
                      {chartPlot.points.map((p, i) => (
                        <text
                          key={p.id}
                          x={p.x}
                          y={chartSize.height - 6}
                          textAnchor={i === 0 ? 'start' : i === chartPlot.points.length - 1 ? 'end' : 'middle'}
                          fontSize={9}
                          fill="var(--text-muted)"
                        >
                          {p.date}
                        </text>
                      ))}
                    </>
                  )}
                </svg>
                {chartPlot.points.length > 0 && (() => {
                  const hoverOrLatest = chartHoverId ?? (chartPlot.points.length === 1 ? chartPlot.points[0].id : null)
                  const p = hoverOrLatest ? chartPlot.points.find(x => x.id === hoverOrLatest) : null
                  if (!p) return null
                  const showTooltip = chartHoverId === p.id || (chartPlot.points.length === 1 && !chartHoverId)
                  if (!showTooltip) return null
                  const leftPct = (p.x / chartSize.width) * 100
                  const topPct = (p.y / chartSize.height) * 100
                  const leftClamp = `${Math.max(8, Math.min(92, leftPct))}%`
                  const topClamp = `${Math.max(12, Math.min(88, topPct))}%`
                  return (
                    <div
                      className="db-teaching-tooltip"
                      style={{
                        position: 'absolute',
                        left: leftClamp,
                        top: topClamp,
                        transform: 'translate(-50%, -100%)',
                        marginTop: -8,
                      }}
                    >
                      <span>{p.fullDate ? new Date(p.fullDate).toLocaleString() : ''}</span>
                      <span>Score: {p.score}</span>
                    </div>
                  )
                })()}
              </div>
              <div className="db-teaching-chart-tabs">
                {CHART_METRIC_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`db-teaching-chart-tab ${chartMetricTab === key ? 'active' : ''}`}
                    onClick={() => setChartMetricTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-card db-teaching-list-wrap">
              <h3 className="db-panel-title">Previous analyses</h3>
              <ul className="db-teaching-list">
                {[...sortedAnalyses].reverse().map(a => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`db-teaching-list-item ${selectedAnalysisId === a.id ? 'selected' : ''}`}
                      onClick={() => onSelectAnalysis(a.id)}
                    >
                      <span className="db-teaching-thumb">
                        {a.thumbnailUrl ? (
                          <img src={a.thumbnailUrl} alt="" />
                        ) : (
                          <Video size={20} className="db-teaching-thumb-icon" />
                        )}
                      </span>
                      <span className="db-teaching-list-label">{formatVideoLabel(a.videoSource)}</span>
                      <span className="db-teaching-list-date">
                        {new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="db-teaching-right">
            <div className="db-teaching-scores-row">
              <div className="db-stat-card db-teaching-score-card">
                <div className="db-stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                  <Eye size={20} />
                </div>
                <div className="db-stat-body">
                  <span className="db-stat-value">{displayScores?.bodyScore ?? '—'}</span>
                  <span className="db-stat-label">Body language score</span>
                </div>
              </div>
              <div className="db-stat-card db-teaching-score-card">
                <div className="db-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  <Mic size={20} />
                </div>
                <div className="db-stat-body">
                  <span className="db-stat-value">{displayScores?.audioScore ?? '—'}</span>
                  <span className="db-stat-label">Audio speaking score</span>
                </div>
              </div>
            </div>
            <div className="glass-card db-teaching-rubric">
              <h3 className="db-panel-title">Lesson observation</h3>
              {selectedSummary ? (
                <>
                  <div className="db-rubric-overall">
                    <div className="db-rubric-overall-scores">
                      <span className="db-rubric-overall-value">{rubricOverallFromTable ?? '—'}</span>
                      <span className="db-rubric-overall-100">
                        {rubricOverall100 != null ? `(${rubricOverall100}/100)` : ''}
                      </span>
                    </div>
                    <span className="db-rubric-overall-label">Overall lesson score</span>
                  </div>
                  <div className="db-rubric-table-wrap">
                    <table className="db-rubric-table">
                      <thead>
                        <tr>
                          <th className="db-rubric-col-criterion">Criterion</th>
                          <th>Remarks <span className="db-rubric-th-note">(Please circle the appropriate descriptor(s))</span></th>
                          <th className="db-rubric-col-score">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rubricTableRows.map((row, i) => {
                          const showCategory =
                            i === 0 || rubricTableRows[i - 1].category !== row.category
                          return (
                            <Fragment key={row.key}>
                              {showCategory && (
                                <tr className="db-rubric-row-section">
                                  <td colSpan={3} className="db-rubric-category">
                                    {row.category}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className="db-rubric-cell-criterion">{row.criterion}</td>
                                <td className="db-rubric-cell-remarks">{row.remarks}</td>
                                <td className="db-rubric-cell-score">{row.score}</td>
                              </tr>
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="db-empty">Select an analysis or run a new one from Transcribe.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
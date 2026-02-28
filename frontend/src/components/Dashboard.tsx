import { useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'
import type { DashboardData } from '../types'
import { fetchDashboard } from '../services/api'

interface Props {
  onNavigate: (tab: string) => void
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

export default function Dashboard({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

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
    </div>
  )
}

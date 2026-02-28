/**
 * Voice Report Component
 *
 * Generates a spoken audio report from transcription text using MiniMax TTS.
 * Features:
 *   - Voice selection (male/female, multiple langs)
 *   - Speed and emotion controls
 *   - Inline audio player with download
 *   - Auto-summarises long transcripts before TTS
 */
import { useState, useEffect, useRef } from 'react'
import { Volume2, Play, Pause, Download, Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { generateTTS, getTTSVoices } from '../services/api'
import type { TTSVoice, TTSResult, TTSEmotion } from '../types'

interface VoiceReportProps {
  /** Transcript text to convert to speech (optional — user can also type) */
  transcriptText?: string
}

const EMOTIONS: { value: TTSEmotion; label: string; icon: string }[] = [
  { value: 'neutral',   label: 'Neutral',   icon: '😐' },
  { value: 'happy',     label: 'Happy',     icon: '😊' },
  { value: 'sad',       label: 'Sad',       icon: '😢' },
  { value: 'angry',     label: 'Angry',     icon: '😠' },
  { value: 'surprised', label: 'Surprised', icon: '😲' },
]

export default function VoiceReport({ transcriptText = '' }: VoiceReportProps) {
  const [text, setText] = useState(transcriptText)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('presenter_male')
  const [speed, setSpeed] = useState(1)
  const [emotion, setEmotion] = useState<TTSEmotion>('neutral')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TTSResult | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync external transcript text
  useEffect(() => {
    if (transcriptText) setText(transcriptText)
  }, [transcriptText])

  // Load voices on mount
  useEffect(() => {
    getTTSVoices()
      .then(data => {
        setVoices(data.voices)
        if (data.voices.length > 0 && !data.voices.find(v => v.id === selectedVoice)) {
          setSelectedVoice(data.voices[0].id)
        }
      })
      .catch(() => { /* use defaults */ })
  }, [])

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setIsPlaying(false)

    try {
      const res = await generateTTS({
        text: text.slice(0, 10000),
        voice_id: selectedVoice,
        speed,
        emotion,
        language_boost: 'auto',
      })
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'TTS generation failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (isPlaying) {
      a.pause()
    } else {
      a.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleDownload = () => {
    if (!result?.audio_url) return
    const a = document.createElement('a')
    a.href = result.audio_url
    a.download = `voice_report.${result.format || 'mp3'}`
    a.click()
  }

  const charCount = text.length
  const charLimit = 10000

  return (
    <div className="voice-report">
      <div className="vr-header">
        <div className="vr-icon"><Volume2 size={24} /></div>
        <div>
          <h2 className="vr-title">Voice Report</h2>
          <p className="vr-subtitle">Convert text into natural speech with MiniMax AI</p>
        </div>
      </div>

      {/* Text Input */}
      <div className="vr-section">
        <label className="vr-label">Text to speak</label>
        <textarea
          className="vr-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your transcript, summary, or any text here…"
          rows={6}
          maxLength={charLimit}
        />
        <div className="vr-char-count">
          <span className={charCount > charLimit * 0.9 ? 'text-warning' : ''}>
            {charCount.toLocaleString()} / {charLimit.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="vr-controls">
        {/* Voice Selector */}
        <div className="vr-control-group">
          <label className="vr-label">Voice</label>
          <div className="vr-select-wrap">
            <select
              className="vr-select"
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
            >
              {voices.length > 0 ? (
                voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>
                ))
              ) : (
                <>
                  <option value="presenter_male">Presenter (Male / en)</option>
                  <option value="presenter_female">Presenter (Female / en)</option>
                  <option value="male-qn-qingse">Qingse (Male / zh)</option>
                  <option value="female-shaonv">Shaonv (Female / zh)</option>
                </>
              )}
            </select>
            <ChevronDown size={16} className="vr-select-icon" />
          </div>
        </div>

        {/* Speed */}
        <div className="vr-control-group">
          <label className="vr-label">Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            className="vr-range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
          />
        </div>

        {/* Emotion */}
        <div className="vr-control-group">
          <label className="vr-label">Emotion</label>
          <div className="vr-emotion-chips">
            {EMOTIONS.map(em => (
              <button
                key={em.value}
                className={`vr-chip ${emotion === em.value ? 'active' : ''}`}
                onClick={() => setEmotion(em.value)}
              >
                {em.icon} {em.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="vr-generate-btn"
        onClick={handleGenerate}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <><Loader2 size={18} className="spin" /> Generating…</>
        ) : result ? (
          <><RefreshCw size={18} /> Regenerate</>
        ) : (
          <><Volume2 size={18} /> Generate Voice Report</>
        )}
      </button>

      {/* Error */}
      {error && <div className="vr-error">{error}</div>}

      {/* Audio Player */}
      {result?.audio_url && (
        <div className="vr-player glass-card">
          <audio
            ref={audioRef}
            src={result.audio_url}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          <button className="vr-play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="vr-player-info">
            <span className="vr-player-label">Voice Report Ready</span>
            <span className="vr-player-meta">
              {result.word_count} words · {(result.duration_ms / 1000).toFixed(1)}s · {result.format.toUpperCase()}
            </span>
          </div>
          <button className="vr-dl-btn" onClick={handleDownload} title="Download audio">
            <Download size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

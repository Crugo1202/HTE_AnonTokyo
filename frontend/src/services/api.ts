/**
 * API Service Module
 * 
 * Handles all HTTP communication with the backend:
 * - File transcription endpoint with progress tracking
 * - YouTube URL transcription endpoint
 * - Error handling and message extraction
 * 
 * API Endpoints:
 * - POST /api/analyze - File upload and transcription
 * - POST /api/analyze/youtube - YouTube URL transcription
 */
import axios, { AxiosError } from 'axios'
import type { TranscriptResult, TTSResult, TTSVoice, VideoGenResult, FullAnalysisResult, FullAnalysisFileOptions, FullAnalysisYoutubeOptions, FeedbackRequest, FeedbackResult, DashboardData } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

/**
 * Extract a readable error message from API response
 * Handles various error formats to provide consistent user feedback
 */
function extractError(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const d = err.response.data as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
  }
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

/** Options for file-based transcription */
export interface TranscribeFileOptions {
  /** Audio/video file to transcribe */
  file: File
  /** Language code (e.g. 'en', 'auto' for auto-detect) */
  language: string
  /** Optional callback for upload progress (0-100%) */
  onProgress?: (pct: number) => void
}

/** Options for YouTube URL transcription */
export interface TranscribeYoutubeOptions {
  /** YouTube video URL to transcribe */
  url: string
  /** Language code (e.g. 'en', 'auto' for auto-detect) */
  language: string
}

/**
 * Transcribe an uploaded audio/video file
 * - Sends file as multipart form data
 * - Reports upload progress via callback
 * - Timeout: 10 minutes for long files
 */
export async function transcribeFile({
  file,
  language,
  onProgress,
}: TranscribeFileOptions): Promise<TranscriptResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)

  try {
    const { data } = await api.post<TranscriptResult>('/analyze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60 * 1000,
      onUploadProgress(evt) {
        if (evt.total) {
          onProgress?.(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/**
 * Transcribe audio from a YouTube URL
 * - Downloads audio from YouTube
 * - Transcribes with language detection
 * - Timeout: 10 minutes for download + transcription
 */
export async function transcribeYoutube({
  url,
  language,
}: TranscribeYoutubeOptions): Promise<TranscriptResult> {
  try {
    const { data } = await api.post<TranscriptResult>('/analyze/youtube', {
      url,
      language,
    }, {
      timeout: 10 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fullAnalysisFile({
  file,
  language,
  usePlaceholder,
  onProgress,
}: FullAnalysisFileOptions): Promise<FullAnalysisResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)
  form.append('use_placeholder', String(usePlaceholder))

  try {
    const { data } = await api.post<FullAnalysisResult>('/full-analysis', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30 * 60 * 1000,
      onUploadProgress(evt) {
        if (evt.total) {
          onProgress?.(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fullAnalysisYoutube({
  url,
  language,
  usePlaceholder,
}: FullAnalysisYoutubeOptions): Promise<FullAnalysisResult> {
  try {
    const { data } = await api.post<FullAnalysisResult>('/full-analysis/youtube', {
      url,
      language,
      use_placeholder: usePlaceholder,
    }, {
      timeout: 30 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Dashboard API ────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const { data } = await api.get<DashboardData>('/dashboard')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── LLM Feedback API (Minimax) ──────────────────────────────────────────

/**
 * Generate teacher feedback from analysis data via Minimax LLM
 */
export async function generateFeedback(body: FeedbackRequest): Promise<FeedbackResult> {
  try {
    const { data } = await api.post<FeedbackResult>('/feedback', body, {
      timeout: 5 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── MiniMax TTS API ──────────────────────────────────────────────────────

/** Request options for TTS generation */
export interface TTSOptions {
  text: string
  voice_id?: string
  speed?: number
  emotion?: string
  language_boost?: string
}

/**
 * Generate speech audio from text using MiniMax TTS
 * Returns an audio URL playable in the browser
 */
export async function generateTTS(opts: TTSOptions): Promise<TTSResult> {
  try {
    const { data } = await api.post<TTSResult>('/tts', opts, {
      timeout: 60 * 1000, // 1 min
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/** Fetch available TTS voices */
export async function getTTSVoices(): Promise<{ voices: TTSVoice[]; emotions: string[] }> {
  try {
    const { data } = await api.get<{ voices: TTSVoice[]; emotions: string[] }>('/tts/voices')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── MiniMax Video Generation API ─────────────────────────────────────────

/** Request options for video generation */
export interface VideoGenOptions {
  prompt: string
  duration?: number
  resolution?: string
  model?: string
}

/**
 * Create a video generation task
 * Returns task_id for polling status
 */
export async function generateVideo(opts: VideoGenOptions): Promise<{ task_id: string }> {
  try {
    const { data } = await api.post<{ task_id: string }>('/video/generate', opts, {
      timeout: 30 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/**
 * Query video generation task status
 * When status is 'Success', download_url will be available
 */
export async function getVideoStatus(taskId: string): Promise<VideoGenResult> {
  try {
    const { data } = await api.get<VideoGenResult>(`/video/status/${taskId}`)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

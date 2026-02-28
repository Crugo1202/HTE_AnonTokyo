/**
 * Application Type Definitions
 * 
 * Core types used throughout the VoiceTrace application for type safety
 */

/** UI theme setting */
export type Theme = 'light' | 'dark'

/** User input method selection */
export type InputMode = 'upload' | 'youtube'

/** Analysis mode: transcription only vs full AI analysis */
export type AnalysisMode = 'transcribe' | 'full-analysis'

/** Top-level navigation tabs */
export type AppTab = 'dashboard' | 'transcribe' | 'voice-report' | 'video-gen'

/** Transcription job lifecycle states */
export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'transcribing'
  | 'analyzing'
  | 'evaluating'
  | 'done'
  | 'error'

/** Individual transcript segment with timing information */
export interface TranscriptSegment {
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Transcribed text for this segment */
  text: string
}

/** Complete transcription result from API */
export interface TranscriptResult {
  job_id: string
  language: string
  duration: number
  full_text: string
  segments: TranscriptSegment[]
  srt_content: string
}

/** Current progress state for active transcription job */
export interface ProgressState {
  status: JobStatus
  percent: number
  message: string
}

// ── MiniMax TTS Types ────────────────────────────────────────────────────

/** Available TTS voice option */
export interface TTSVoice {
  id: string
  name: string
  lang: string
}

/** TTS generation request parameters */
export interface TTSRequest {
  text: string
  voice_id: string
  speed?: number
  emotion?: string
  language_boost?: string
}

/** TTS generation response */
export interface TTSResult {
  audio_url: string
  duration_ms: number
  sample_rate: number
  word_count: number
  format: string
}

/** Emotion options for TTS */
export type TTSEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised'

// ── MiniMax Video Generation Types ───────────────────────────────────────

/** Video generation task status */
export type VideoStatus = 'Preparing' | 'Queueing' | 'Processing' | 'Success' | 'Fail'

/** Video generation request */
export interface VideoGenRequest {
  prompt: string
  duration?: 6 | 10
  resolution?: '720P' | '768P' | '1080P'
  model?: string
}

/** Video generation task result */
export interface VideoGenResult {
  task_id: string
  status: VideoStatus
  file_id?: string | null
  video_width?: number | null
  video_height?: number | null
  download_url?: string | null
}

// ── Full Analysis Types ───────────────────────────────────────────────────

/** Individual body-language segment */
export interface BodyLanguageSegment {
  segment: number
  start: string
  end: string
  markdown: string
}

/** Body language analysis report */
export interface BodyLanguageReport {
  segments: BodyLanguageSegment[]
  combined_report: string
  model: string
}

/** Combined full analysis result (body language + rubric + transcript) */
export interface FullAnalysisResult {
  is_placeholder: boolean
  transcript?: TranscriptResult
  body_language?: BodyLanguageReport
  rubric_evaluation?: string
}

/** Options for file-based full analysis */
export interface FullAnalysisFileOptions {
  file: File
  language: string
  usePlaceholder: boolean
  onProgress?: (pct: number) => void
}

/** Options for YouTube-based full analysis */
export interface FullAnalysisYoutubeOptions {
  url: string
  language: string
  usePlaceholder: boolean
}

// ── Dashboard Types ──────────────────────────────────────────────────────

export interface ServiceStatus {
  name: string
  configured: boolean
  label: string
}

export interface DashboardStats {
  transcriptions: number
  full_analyses: number
  feedback_generated: number
  uptime_seconds: number
}

export interface DashboardData {
  status: string
  version: string
  services: ServiceStatus[]
  stats: DashboardStats
  capabilities: string[]
}

// ── LLM Feedback Types ──────────────────────────────────────────────────

/** Feedback generation request */
export interface FeedbackRequest {
  transcript?: string
  body_language_report?: string
  rubric_evaluation?: string
  additional_context?: string
}

/** Feedback generation response from Minimax LLM */
export interface FeedbackResult {
  status: string
  feedback: string
  model: string
}

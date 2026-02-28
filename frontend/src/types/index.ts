export type Theme = 'light' | 'dark'

export type InputMode = 'upload' | 'youtube'

export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'transcribing'
  | 'done'
  | 'error'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptResult {
  job_id: string
  language: string
  duration: number
  full_text: string
  segments: TranscriptSegment[]
  srt_content: string
}

export interface ProgressState {
  status: JobStatus
  percent: number
  message: string
}

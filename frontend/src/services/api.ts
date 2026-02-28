import axios, { AxiosError } from 'axios'
import type { TranscriptResult } from '../types'

const api = axios.create({ baseURL: '/api' })

/** Extract a readable error message from whatever the server returns */
function extractError(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const d = err.response.data as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
  }
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

export interface TranscribeFileOptions {
  file: File
  language: string
  onProgress?: (pct: number) => void
}

export interface TranscribeYoutubeOptions {
  url: string
  language: string
}

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
      timeout: 10 * 60 * 1000, // 10 min for long files
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

export async function transcribeYoutube({
  url,
  language,
}: TranscribeYoutubeOptions): Promise<TranscriptResult> {
  try {
    const { data } = await api.post<TranscriptResult>('/analyze/youtube', {
      url,
      language,
    }, {
      timeout: 10 * 60 * 1000, // 10 min for download + transcribe
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export type VoiceCategory = '十番锣鼓经' | '乡音祝福' | '童谣故事' | '老手艺口诀'

export interface VoiceRecording {
  id: string
  title: string
  category: VoiceCategory
  createdAt: Date
  duration: number
  averageVolume: number
  mimeType: string
  blob: Blob
  url: string
}

export interface RecordingResult {
  blob: Blob
  url: string
  mimeType: string
  duration: number
}

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error'

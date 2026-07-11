import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type { RecorderStatus, RecordingResult } from '@/types/voice'
import { getMicrophoneStream, selectRecorderOptions, stopMediaStream } from '@/utils/audio'
import { formatElapsed } from '@/utils/format'

export function useMediaRecorder() {
  const status = ref<RecorderStatus>('idle')
  const errorMessage = ref('')
  const elapsedSeconds = ref(0)
  const stream = shallowRef<MediaStream | null>(null)

  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let startedAt = 0
  let timerId: number | null = null
  let resolveStop: ((value: RecordingResult) => void) | null = null
  let rejectStop: ((reason?: unknown) => void) | null = null

  const isRecording = computed(() => status.value === 'recording')
  const elapsedLabel = computed(() => formatElapsed(elapsedSeconds.value))

  function clearTimer() {
    if (timerId !== null) window.clearInterval(timerId)
    timerId = null
  }

  function cleanupStream() {
    stopMediaStream(stream.value)
    stream.value = null
  }

  function resetRecorder() {
    recorder = null
    chunks = []
    clearTimer()
    cleanupStream()
  }

  async function start(): Promise<void> {
    if (isRecording.value) return
    errorMessage.value = ''
    status.value = 'requesting'

    try {
      const mediaStream = await getMicrophoneStream()
      stream.value = mediaStream
      recorder = new MediaRecorder(mediaStream, selectRecorderOptions())
      chunks = []

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      })

      recorder.addEventListener('error', (event) => {
        const message = event.error?.message || '录音器发生未知错误。'
        errorMessage.value = message
        status.value = 'error'
        rejectStop?.(new Error(message))
        resolveStop = null
        rejectStop = null
        resetRecorder()
      })

      recorder.addEventListener('stop', () => {
        const duration = Math.max(0.1, (performance.now() - startedAt) / 1000)
        const mimeType = recorder?.mimeType || chunks[0]?.type || 'audio/webm'
        const blob = new Blob(chunks, { type: mimeType })
        const result: RecordingResult = {
          blob,
          url: URL.createObjectURL(blob),
          mimeType,
          duration,
        }
        resolveStop?.(result)
        resolveStop = null
        rejectStop = null
        status.value = 'idle'
        resetRecorder()
      })

      startedAt = performance.now()
      elapsedSeconds.value = 0
      timerId = window.setInterval(() => {
        elapsedSeconds.value = (performance.now() - startedAt) / 1000
      }, 200)

      recorder.start(250)
      status.value = 'recording'
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法获取麦克风权限。'
      errorMessage.value = message
      status.value = 'error'
      resetRecorder()
      throw error
    }
  }

  function stop(): Promise<RecordingResult> {
    if (!recorder || recorder.state !== 'recording') {
      return Promise.reject(new Error('当前没有正在进行的录音。'))
    }

    status.value = 'stopping'
    return new Promise<RecordingResult>((resolve, reject) => {
      resolveStop = resolve
      rejectStop = reject
      recorder?.stop()
    })
  }

  function cancel(): void {
    resolveStop = null
    rejectStop = null
    if (recorder?.state === 'recording') recorder.stop()
    else resetRecorder()
    status.value = 'idle'
  }

  onBeforeUnmount(cancel)

  return {
    status,
    errorMessage,
    elapsedSeconds,
    elapsedLabel,
    stream,
    isRecording,
    start,
    stop,
    cancel,
  }
}

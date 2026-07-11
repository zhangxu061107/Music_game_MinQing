const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

export function selectRecorderOptions(): MediaRecorderOptions {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return {}
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  return mimeType ? { mimeType } : {}
}

export async function getMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持网页录音，请使用最新版 Chrome、Edge 或 Safari。')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function playObjectUrl(url: string): Promise<void> {
  const audio = new Audio(url)
  await audio.play()
}

export function getRecordingEnvironmentMessage(): string {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return '当前浏览器不支持网页录音，请使用最新版 Chrome、Edge 或 Safari。'
  }
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return '录音需要 HTTPS 或 localhost 环境，请使用 npm run dev 启动项目。'
  }
  return '录音环境正常。首次录音时，请在浏览器提示中允许使用麦克风。'
}

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    stream: MediaStream | null
    active: boolean
    variant?: 'warm' | 'green'
  }>(),
  { variant: 'warm' },
)

const emit = defineEmits<{ level: [value: number] }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null
let samples = new Uint8Array(2048)

function palette() {
  return props.variant === 'green'
    ? { background: '#eaffdf', start: '#1ca455', end: '#8dea6d', bars: 'rgba(35, 170, 86, .13)' }
    : { background: '#fff1c9', start: '#d92323', end: '#ff9a22', bars: 'rgba(225, 93, 37, .13)' }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(rect.width * dpr))
  const height = Math.max(1, Math.floor(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

function drawIdle() {
  const canvas = canvasRef.value
  if (!canvas) return
  resizeCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const colors = palette()
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(112, 70, 35, .22)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
}

function drawFrame() {
  const canvas = canvasRef.value
  if (!canvas || !analyser || !props.active) return
  resizeCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  analyser.getByteTimeDomainData(samples)
  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const colors = palette()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)

  let total = 0
  for (const sample of samples) total += Math.abs((sample - 128) / 128)
  const level = total / samples.length
  emit('level', level)

  const bars = 24
  ctx.fillStyle = colors.bars
  for (let i = 0; i < bars; i += 1) {
    const barHeight = 12 + level * 190 + Math.sin(performance.now() / 180 + i * 0.65) * 5
    const x = (i * width) / bars
    ctx.fillRect(x, height / 2 - barHeight / 2, width / bars - 4, barHeight)
  }

  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, colors.start)
  gradient.addColorStop(1, colors.end)
  ctx.strokeStyle = gradient
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.beginPath()

  const points = Math.max(80, Math.floor(width / 3))
  for (let point = 0; point < points; point += 1) {
    const index = Math.floor((point / Math.max(1, points - 1)) * (samples.length - 1))
    const x = (point / Math.max(1, points - 1)) * width
    const y = height / 2 + ((samples[index] ?? 128) - 128) / 128 * height * 0.38
    if (point === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  animationId = requestAnimationFrame(drawFrame)
}

async function startDrawing() {
  stopDrawing()
  if (!props.stream || !props.active) {
    drawIdle()
    return
  }
  await nextTick()
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  audioContext = new AudioContextClass()
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  source = audioContext.createMediaStreamSource(props.stream)
  source.connect(analyser)
  samples = new Uint8Array(analyser.fftSize)
  drawFrame()
}

function stopDrawing() {
  cancelAnimationFrame(animationId)
  animationId = 0
  source?.disconnect()
  analyser?.disconnect()
  void audioContext?.close()
  source = null
  analyser = null
  audioContext = null
  drawIdle()
}

watch(() => [props.stream, props.active] as const, startDrawing)

onMounted(() => {
  resizeObserver = new ResizeObserver(drawIdle)
  if (canvasRef.value) resizeObserver.observe(canvasRef.value)
  void startDrawing()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  stopDrawing()
})
</script>

<template>
  <canvas ref="canvasRef" class="waveform" aria-label="实时录音声波"></canvas>
</template>

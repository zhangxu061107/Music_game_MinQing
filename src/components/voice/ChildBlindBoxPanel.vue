<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import WaveformCanvas from '@/components/common/WaveformCanvas.vue'
import { useMediaRecorder } from '@/composables/useMediaRecorder'
import { useVoiceStore } from '@/stores/voice'
import { clamp, formatDateTime } from '@/utils/format'
import { playObjectUrl } from '@/utils/audio'

const emit = defineEmits<{ home: []; elder: [] }>()
const store = useVoiceStore()
const followRecorder = useMediaRecorder()
const isDrawing = ref(false)
const followLevels = ref<number[]>([])
const scoreText = ref('完成跟读后，这里会出现评分。')

const selected = computed(() => store.selected)
const followStatus = computed(() => (followRecorder.isRecording.value ? '正在跟读' : '准备跟读'))

function drawCard() {
  if (store.recordings.length === 0 || isDrawing.value) return
  isDrawing.value = true
  window.setTimeout(() => {
    store.selectRandom()
    scoreText.value = '点击“播放乡音”听一遍，再点击“我也学一句”进行跟读。'
    isDrawing.value = false
  }, 900)
}

function collectLevel(level: number) {
  followLevels.value.push(level)
  if (followLevels.value.length > 240) followLevels.value.shift()
}

function calculateScore(originalDuration: number, followDuration: number, originalVolume: number) {
  const timeScore = Math.max(55, 100 - Math.abs(followDuration - originalDuration) * 18)
  const followVolume = followLevels.value.length
    ? followLevels.value.reduce((sum, value) => sum + value, 0) / followLevels.value.length
    : 0
  const volumeScore = Math.max(65, 100 - Math.abs(originalVolume - followVolume) * 300)
  return Math.round(clamp(timeScore * 0.78 + volumeScore * 0.22, 0, 100))
}

function medalFor(score: number) {
  if (score >= 92) return '金牌乡音小传人'
  if (score >= 82) return '认真跟读小能手'
  if (score >= 72) return '乡音练习小乐师'
  return '勇敢开口小达人'
}

async function toggleFollow() {
  if (!selected.value) {
    scoreText.value = '请先抽取一张乡音卡。'
    return
  }

  try {
    if (!followRecorder.isRecording.value) {
      followLevels.value = []
      scoreText.value = '正在跟读，请尽量模仿刚才听到的乡音。'
      await followRecorder.start()
      return
    }

    const original = selected.value
    const result = await followRecorder.stop()
    const score = calculateScore(original.duration, result.duration, original.averageVolume)
    scoreText.value = `相似度 ${score}%！获得“${medalFor(score)}”勋章！原声 ${original.duration.toFixed(1)} 秒，跟读 ${result.duration.toFixed(1)} 秒。`
    URL.revokeObjectURL(result.url)
  } catch (error) {
    scoreText.value = `跟读录音失败：${error instanceof Error ? error.message : '请检查麦克风权限。'}`
  }
}
</script>

<template>
  <section class="voice-stack">
    <div class="voice-card panel-card section-heading">
      <div>
        <h2>儿童盲盒端</h2>
        <p>抽一张乡音卡，听一听，再学一句。</p>
      </div>
      <div class="button-row">
        <AppButton tone="light" @click="emit('home')">返回功能首页</AppButton>
        <AppButton tone="primary" @click="emit('elder')">去老人端录音</AppButton>
      </div>
    </div>

    <div class="blind-box-layout">
      <section class="blind-machine" :class="{ 'blind-machine--drawing': isDrawing }">
        <h2>乡音盲盒机</h2>
        <div class="blind-machine__window">🎁</div>
        <AppButton tone="danger" block :disabled="isDrawing" @click="drawCard">
          {{ isDrawing ? '正在抽取……' : '抽取乡音盲盒' }}
        </AppButton>
        <p>当前有 {{ store.recordings.length }} 张声音卡</p>
        <p v-if="store.recordings.length === 0">请先到老人录音端录制声音。</p>
      </section>

      <section class="voice-card panel-card follow-panel">
        <article class="selected-card" :class="{ 'selected-card--drawing': isDrawing }">
          <template v-if="selected">
            <h2>{{ selected.title }}</h2>
            <p>{{ selected.category }}</p>
            <p>录制时间：{{ formatDateTime(selected.createdAt) }}</p>
            <p>原声时长：{{ selected.duration.toFixed(1) }} 秒</p>
          </template>
          <template v-else>
            <h2>还没有抽到声音</h2>
            <p>请先抽取乡音盲盒。</p>
          </template>
        </article>

        <div class="button-row button-row--equal">
          <AppButton tone="dark" block :disabled="!selected" @click="selected && playObjectUrl(selected.url)">播放乡音</AppButton>
          <AppButton
            :tone="followRecorder.isRecording.value ? 'danger' : 'green'"
            block
            :disabled="!selected"
            @click="toggleFollow"
          >
            {{ followRecorder.isRecording.value ? '停止跟读' : '我也学一句' }}
          </AppButton>
        </div>

        <span class="status-pill" :class="followRecorder.isRecording.value ? 'status-pill--recording' : 'status-pill--ready'">
          {{ followStatus }}
        </span>
        <strong class="timer-text timer-text--green">{{ followRecorder.elapsedLabel.value }}</strong>
        <WaveformCanvas
          variant="green"
          :stream="followRecorder.stream.value"
          :active="followRecorder.isRecording.value"
          @level="collectLevel"
        />
        <p class="score-box">{{ scoreText }}</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import WaveformCanvas from '@/components/common/WaveformCanvas.vue'
import VoiceLibrary from './VoiceLibrary.vue'
import { useMediaRecorder } from '@/composables/useMediaRecorder'
import { useVoiceStore } from '@/stores/voice'
import type { VoiceCategory } from '@/types/voice'

const emit = defineEmits<{ home: []; child: [] }>()
const store = useVoiceStore()
const recorder = useMediaRecorder()
const title = ref('一段乡音')
const category = ref<VoiceCategory>('十番锣鼓经')
const message = ref('点击大圆按钮开始录音。录完后会自动保存。')
const levels = ref<number[]>([])

const categories: VoiceCategory[] = ['十番锣鼓经', '乡音祝福', '童谣故事', '老手艺口诀']
const stateTone = computed(() => (recorder.isRecording.value ? 'recording' : message.value.startsWith('已保存') ? 'done' : 'ready'))
const stateLabel = computed(() => (recorder.isRecording.value ? '正在录音' : stateTone.value === 'done' ? '录音完成' : '准备录音'))

function collectLevel(level: number) {
  levels.value.push(level)
  if (levels.value.length > 240) levels.value.shift()
}

async function toggleRecording() {
  try {
    if (!recorder.isRecording.value) {
      levels.value = []
      message.value = '正在录音，请对着麦克风说话。再次点击大圆按钮即可保存。'
      await recorder.start()
      return
    }

    const result = await recorder.stop()
    const averageVolume = levels.value.length
      ? levels.value.reduce((sum, value) => sum + value, 0) / levels.value.length
      : 0
    const recordingTitle = title.value.trim() || '一段乡音'
    store.add({
      id: crypto.randomUUID(),
      title: recordingTitle,
      category: category.value,
      createdAt: new Date(),
      duration: result.duration,
      averageVolume,
      mimeType: result.mimeType,
      blob: result.blob,
      url: result.url,
    })
    message.value = `已保存：${recordingTitle}（${result.duration.toFixed(1)} 秒）`
  } catch (error) {
    message.value = `录音失败：${error instanceof Error ? error.message : '请检查麦克风权限。'}`
  }
}

function pickAndGo(id: string) {
  store.select(id)
  emit('child')
}
</script>

<template>
  <section class="voice-stack">
    <div class="voice-card panel-card section-heading">
      <div>
        <h2>老人录音端</h2>
        <p>一键录音，一键保存到当前乡音库。</p>
      </div>
      <div class="button-row">
        <AppButton tone="light" @click="emit('home')">返回功能首页</AppButton>
        <AppButton tone="green" @click="emit('child')">去儿童端抽卡</AppButton>
      </div>
    </div>

    <div class="voice-card panel-card recorder-layout">
      <div class="record-control">
        <button
          class="record-circle"
          :class="recorder.isRecording.value ? 'record-circle--recording' : 'record-circle--ready'"
          type="button"
          @click="toggleRecording"
        >
          {{ recorder.isRecording.value ? '停止录音' : '开始录音' }}
        </button>
        <span class="status-pill" :class="`status-pill--${stateTone}`">{{ stateLabel }}</span>
        <strong class="timer-text">{{ recorder.elapsedLabel.value }}</strong>
      </div>

      <div class="recorder-content">
        <div class="field-grid">
          <label>
            <span>声音分类</span>
            <select v-model="category">
              <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label>
            <span>声音名称</span>
            <input v-model="title" maxlength="30" />
          </label>
        </div>

        <WaveformCanvas
          variant="warm"
          :stream="recorder.stream.value"
          :active="recorder.isRecording.value"
          @level="collectLevel"
        />
        <p class="operation-tip">{{ message }}</p>
      </div>
    </div>

    <VoiceLibrary @pick="pickAndGo" />
  </section>
</template>

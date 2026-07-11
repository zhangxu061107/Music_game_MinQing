<script setup lang="ts">
import { useVoiceStore } from '@/stores/voice'
import { formatDateTime } from '@/utils/format'
import { playObjectUrl } from '@/utils/audio'
import AppButton from '@/components/common/AppButton.vue'

const store = useVoiceStore()
const emit = defineEmits<{ pick: [id: string] }>()
</script>

<template>
  <section class="voice-card panel-card">
    <div class="section-heading">
      <div>
        <h2>已保存声音</h2>
        <p>录音仅保存在当前页面内，刷新页面后会清空。</p>
      </div>
      <AppButton v-if="store.recordings.length" tone="dark" @click="store.clear">清空声音</AppButton>
    </div>

    <p v-if="store.recordings.length === 0" class="empty-tip">还没有保存声音，请先录一段乡音。</p>

    <div v-else class="voice-library-grid">
      <article v-for="recording in store.recordings" :key="recording.id" class="recording-card">
        <h3>{{ recording.title }}</h3>
        <p>{{ recording.category }}</p>
        <p>{{ formatDateTime(recording.createdAt) }}</p>
        <p>时长：{{ recording.duration.toFixed(1) }} 秒</p>
        <div class="button-row">
          <AppButton tone="dark" @click="playObjectUrl(recording.url)">播放</AppButton>
          <AppButton tone="green" @click="emit('pick', recording.id)">抽取它</AppButton>
          <AppButton tone="danger" @click="store.remove(recording.id)">删除</AppButton>
        </div>
      </article>
    </div>
  </section>
</template>

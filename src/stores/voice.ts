import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { VoiceRecording } from '@/types/voice'

export const useVoiceStore = defineStore('voice-library', () => {
  const recordings = ref<VoiceRecording[]>([])
  const selectedId = ref<string | null>(null)

  const selected = computed(
    () => recordings.value.find((item) => item.id === selectedId.value) ?? null,
  )

  function add(recording: VoiceRecording): void {
    recordings.value.unshift(recording)
    selectedId.value = recording.id
  }

  function remove(id: string): void {
    const target = recordings.value.find((item) => item.id === id)
    if (target) URL.revokeObjectURL(target.url)
    recordings.value = recordings.value.filter((item) => item.id !== id)
    if (selectedId.value === id) selectedId.value = recordings.value[0]?.id ?? null
  }

  function clear(): void {
    recordings.value.forEach((item) => URL.revokeObjectURL(item.url))
    recordings.value = []
    selectedId.value = null
  }

  function select(id: string): VoiceRecording | null {
    const target = recordings.value.find((item) => item.id === id) ?? null
    selectedId.value = target?.id ?? null
    return target
  }

  function selectRandom(): VoiceRecording | null {
    if (recordings.value.length === 0) return null
    const index = Math.floor(Math.random() * recordings.value.length)
    const target = recordings.value[index] ?? null
    selectedId.value = target?.id ?? null
    return target
  }

  return { recordings, selectedId, selected, add, remove, clear, select, selectRandom }
})

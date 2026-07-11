<script setup lang="ts">
import AppButton from './AppButton.vue'

defineProps<{ title: string; subtitle?: string; backLabel?: string }>()
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <header class="app-header">
    <div class="app-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <AppButton tone="light" @click="emit('back')">{{ backLabel ?? '返回大厅' }}</AppButton>
  </header>
</template>

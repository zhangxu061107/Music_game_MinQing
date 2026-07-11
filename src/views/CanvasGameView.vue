<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'

const props = defineProps<{ title: string; source: string }>()
const router = useRouter()
const gameUrl = computed(() => `${import.meta.env.BASE_URL}${props.source}`)
</script>

<template>
  <main class="canvas-game-page">
    <AppHeader :title="title" subtitle="Canvas 游戏运行区" @back="router.push('/')" />
    <iframe class="game-frame" :title="title" :src="gameUrl" allow="autoplay"></iframe>
  </main>
</template>

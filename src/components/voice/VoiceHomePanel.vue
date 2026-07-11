<script setup lang="ts">
const emit = defineEmits<{ elder: []; child: [] }>()
</script>

<template>
  <section class="voice-entry-grid">
    <button class="voice-entry-card" type="button" @click="emit('elder')">
      <div class="voice-entry-card__icon">🎙️</div>
      <h2>老人录音端</h2>
      <p>录下十番锣鼓经、乡音祝福、童谣故事或老手艺口诀。</p>
    </button>
    <button class="voice-entry-card" type="button" @click="emit('child')">
      <div class="voice-entry-card__icon">🎁</div>
      <h2>儿童盲盒端</h2>
      <p>抽取乡音卡片，播放老人录音，再跟读一句获得勋章。</p>
    </button>
  </section>
</template>

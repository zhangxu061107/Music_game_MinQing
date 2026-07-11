<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  title: string
  subtitle: string
  description: string
  route: string
  image?: string
  mark?: string
  tags: string[]
}>()
</script>

<template>
  <article class="game-card">
    <div class="game-card__heading">
      <div class="game-card__icon">
        <img v-if="image" :src="image" alt="" />
        <span v-else>{{ mark }}</span>
      </div>
      <div>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    <p class="game-card__description">{{ description }}</p>
    <div class="tag-list">
      <span v-for="tag in tags" :key="tag">{{ tag }}</span>
    </div>
    <RouterLink class="game-card__link" :to="route">进入体验</RouterLink>
  </article>
</template>

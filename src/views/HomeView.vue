<script setup lang="ts">
import GameCard from '@/components/common/GameCard.vue'

const base = import.meta.env.BASE_URL
const games = [
  {
    title: '十番音乐节奏接龙',
    subtitle: '节奏操作 · 鼓锣互动',
    description: '根据下落音符点击对应判定区，用鼓点和锣声完成节奏演奏。',
    route: '/rhythm',
    image: `${base}assets/instruments/drum.png`,
    tags: ['节奏判定', '连击反馈', '鼓锣音效'],
  },
  {
    title: '四音记忆小舞台',
    subtitle: '听觉记忆 · 乐器接龙',
    description: '先听鼓、锣、木鱼和铃组成的声音序列，再按相同顺序完成接龙。',
    route: '/memory',
    mark: '记',
    tags: ['四种音色', '记忆挑战', '关卡推进'],
  },
  {
    title: '乡音盲盒录音解锁',
    subtitle: '老人录音 · 儿童抽卡 · 跟读评分',
    description: '录下乡音内容，抽取声音卡片并跟读，让声音记录与互动体验连接起来。',
    route: '/voice',
    mark: '音',
    tags: ['真实录音', '实时声波', '抽卡播放', '跟读评分'],
  },
]
</script>

<template>
  <main class="lobby-page">
    <section class="lobby-panel">
      <header class="lobby-hero">
        <div>
          <span class="eyebrow">非遗音乐 · 乡音传承 · 互动体验</span>
          <h1>乐韵游戏盒</h1>
          <p>围绕传统音乐、乐器记忆与方言声音传承设计的网页互动作品。</p>
        </div>
        <div class="hero-instruments" aria-hidden="true">
          <img :src="`${base}assets/instruments/drum.png`" alt="" />
          <img :src="`${base}assets/instruments/gong.png`" alt="" />
        </div>
      </header>

      <section class="game-grid" aria-label="游戏入口">
        <GameCard v-for="game in games" :key="game.route" v-bind="game" />
      </section>
    </section>
  </main>
</template>

import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import CanvasGameView from '@/views/CanvasGameView.vue'
import VoiceBoxView from '@/views/VoiceBoxView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/rhythm',
      name: 'rhythm',
      component: CanvasGameView,
      props: { title: '十番音乐节奏接龙', source: 'games/rhythm/index.html' },
    },
    {
      path: '/memory',
      name: 'memory',
      component: CanvasGameView,
      props: { title: '四音记忆小舞台', source: 'games/memory/index.html' },
    },
    { path: '/voice', name: 'voice', component: VoiceBoxView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router

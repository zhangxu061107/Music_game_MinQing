<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import VoiceHomePanel from '@/components/voice/VoiceHomePanel.vue'
import ElderRecorderPanel from '@/components/voice/ElderRecorderPanel.vue'
import ChildBlindBoxPanel from '@/components/voice/ChildBlindBoxPanel.vue'
import { getRecordingEnvironmentMessage } from '@/utils/audio'

type Section = 'home' | 'elder' | 'child'
const section = ref<Section>('home')
const router = useRouter()
const environmentMessage = getRecordingEnvironmentMessage()
</script>

<template>
  <main class="voice-page">
    <AppHeader
      title="乡音盲盒"
      subtitle="录下乡音，抽取声音，跟读传承"
      @back="router.push('/')"
    />
    <div class="voice-page__content">
      <p class="environment-tip">{{ environmentMessage }}</p>
      <VoiceHomePanel v-if="section === 'home'" @elder="section = 'elder'" @child="section = 'child'" />
      <ElderRecorderPanel
        v-else-if="section === 'elder'"
        @home="section = 'home'"
        @child="section = 'child'"
      />
      <ChildBlindBoxPanel v-else @home="section = 'home'" @elder="section = 'elder'" />
    </div>
  </main>
</template>

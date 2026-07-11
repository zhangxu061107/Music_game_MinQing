<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'primary' | 'green' | 'light' | 'dark' | 'danger'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { tone: 'primary', block: false, disabled: false, type: 'button' },
)
</script>

<template>
  <button
    class="app-button"
    :class="[`app-button--${tone}`, { 'app-button--block': block }]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

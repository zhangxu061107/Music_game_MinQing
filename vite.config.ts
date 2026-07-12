import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const srcDir = new URL('./src', import.meta.url).pathname

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})

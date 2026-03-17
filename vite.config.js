import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // 默认使用根路径，方便自托管（如 http://ip:5555/ ）
  // 若要部署到 GitHub Pages（/AI-Chat-Deom/），请在构建时设置 BASE=AI-Chat-Deom
  base: process.env.BASE ? `/${process.env.BASE}/` : '/',
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    allowedHosts: true
  }
})

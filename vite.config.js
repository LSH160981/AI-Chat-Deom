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

  /**
   * 生产构建移除 console/debugger（避免上线后刷日志）
   * 注：这会移除所有 console.*（包括 console.error）。如需保留错误日志再告诉我。
   */
  esbuild: {
    drop: ['console', 'debugger'],
  },

  /**
   * 构建优化：拆分大体积依赖，避免单个 chunk 过大（>500KB）
   * - vue 相关：vue / vue-router / vue-i18n
   * - markdown 渲染：markdown-it / highlight.js / katex
   */
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'vue-i18n'],
          markdown: ['markdown-it', 'highlight.js', 'katex'],
        },
      },
    },
  },

  server: {
    allowedHosts: true
  }
})

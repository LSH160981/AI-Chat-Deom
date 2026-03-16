<template>
  <div id="app">
    <router-view />
    <AppModal
      v-model="modalState.visible"
      :title="modalState.title"
      :message="modalState.message"
      :icon="modalState.icon"
      :type="modalState.type"
      :confirmText="modalState.confirmText"
      :cancelText="modalState.cancelText"
      :showCancel="modalState.showCancel"
      @confirm="modalOnConfirm"
      @cancel="modalOnCancel"
    />
  </div>
</template>

<script setup>
import { watch, onMounted } from 'vue'
import AppModal from './components/AppModal.vue'
import { useModal } from './composables/useModal'
import { settings } from './stores/settings'

const { state: modalState, onConfirm: modalOnConfirm, onCancel: modalOnCancel } = useModal()

// ===== 主题变量 =====
const THEME_COLORS = {
  light: '#ffffff',
  dark: '#141414',
}

const applyTheme = (theme) => {
  const html = document.documentElement
  html.classList.remove('theme-light', 'theme-dark')

  let isDark
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.add(isDark ? 'theme-dark' : 'theme-light')
  } else {
    isDark = theme === 'dark'
    html.classList.add(`theme-${theme}`)
  }

  // 更新 iOS 状态栏颜色
  const color = isDark ? THEME_COLORS.dark : THEME_COLORS.light
  document.getElementById('meta-theme-color')?.setAttribute('content', color)
  // apple-mobile-web-app-status-bar-style：深色用 black-translucent，浅色用 default
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', isDark ? 'black-translucent' : 'default')
}

// ===== 字体大小 =====
const fontSizeMap = { sm: '13px', md: '15px', lg: '17px' }
const applyFontSize = (size) => {
  document.documentElement.style.setProperty('--chat-font-size', fontSizeMap[size] || '15px')
}

// 初始应用 + 监听变化
onMounted(() => {
  applyTheme(settings.theme)
  applyFontSize(settings.fontSize)

  // system 主题跟随系统变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme('system')
  })
})

watch(() => settings.theme, applyTheme)
watch(() => settings.fontSize, applyFontSize)
</script>

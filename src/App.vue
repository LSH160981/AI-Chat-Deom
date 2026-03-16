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

// ===== 主题 =====
const applyTheme = (theme) => {
  const html = document.documentElement
  html.classList.remove('theme-light', 'theme-dark')

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
  } else {
    html.classList.add(`theme-${theme}`)
  }
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

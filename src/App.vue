<template>
  <!-- 应用根容器，所有页面都在此节点下渲染 -->
  <div id="app">
    <!-- 路由出口：根据当前 URL 动态渲染对应页面组件（AIChat / SettingsPage） -->
    <router-view />

    <!-- 全局模态对话框，挂载在根层保证始终在最顶层显示 -->
    <!-- 通过 useModal composable 统一管理显示状态 -->
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
/**
 * App.vue - 根组件
 *
 * 职责：
 *  1. 挂载全局模态框（AppModal），供全应用通过 useModal() 调用
 *  2. 根据 settings.theme 动态切换 HTML 根节点的主题 class，
 *     并同步更新移动端状态栏颜色（meta theme-color）
 *  3. 根据 settings.fontSize 动态设置 CSS 变量 --chat-font-size
 *  4. 监听系统深色模式变化，当 theme 为 'system' 时自动跟随
 */
import { watch, onMounted } from 'vue'
import AppModal from './components/AppModal.vue'
import { useModal } from './composables/useModal'
import { settings } from './stores/settings'

/** 解构模态框状态和回调，传入 AppModal 组件 */
const { state: modalState, onConfirm: modalOnConfirm, onCancel: modalOnCancel } = useModal()

// ===== 主题变量 =====

/**
 * 不同主题对应的 iOS/移动端状态栏背景色。
 * 用于更新 <meta name="theme-color"> 标签。
 */
const THEME_COLORS = {
  light: '#ffffff',
  dark: '#141414',
}

/**
 * 应用主题到 <html> 元素。
 *
 * 操作：
 *  1. 移除旧主题 class（theme-light / theme-dark）
 *  2. 根据 theme 值（light / dark / system）添加新 class
 *  3. 更新移动端 meta theme-color，让浏览器状态栏颜色与主题一致
 *  4. 更新 Apple PWA 状态栏样式（深色用 black-translucent，浅色用 default）
 *
 * @param {string} theme - 主题名称：'light' | 'dark' | 'system'
 */
const applyTheme = (theme) => {
  const html = document.documentElement
  // 先清除已有主题 class，避免同时存在多个主题
  html.classList.remove('theme-light', 'theme-dark')

  let isDark
  if (theme === 'system') {
    // 跟随系统：读取系统颜色方案偏好
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.add(isDark ? 'theme-dark' : 'theme-light')
  } else {
    // 手动指定主题
    isDark = theme === 'dark'
    html.classList.add(`theme-${theme}`)
  }

  // 更新 iOS 状态栏颜色（PWA / Safari 专用 meta 标签）
  const color = isDark ? THEME_COLORS.dark : THEME_COLORS.light
  document.getElementById('meta-theme-color')?.setAttribute('content', color)
  // apple-mobile-web-app-status-bar-style：深色用 black-translucent，浅色用 default
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', isDark ? 'black-translucent' : 'default')
}

// ===== 字体大小 =====

/**
 * 字体档位到 CSS px 值的映射表。
 * 对应设置页中的「小 / 中 / 大」三档字体大小。
 */
const fontSizeMap = { sm: '13px', md: '15px', lg: '17px' }

/**
 * 将字体大小设置应用到 CSS 变量 --chat-font-size。
 * 聊天消息气泡通过此变量统一控制字体大小。
 *
 * @param {string} size - 字体档位：'sm' | 'md' | 'lg'
 */
const applyFontSize = (size) => {
  document.documentElement.style.setProperty('--chat-font-size', fontSizeMap[size] || '15px')
}

/**
 * 组件挂载后初始化主题和字体大小，并注册系统颜色方案变更监听。
 * 必须在 onMounted 中执行（保证 DOM 已就绪）。
 */
onMounted(() => {
  applyTheme(settings.theme)
  applyFontSize(settings.fontSize)

  // 监听系统深色/浅色模式切换事件
  // 仅当用户选择了 'system' 主题时才响应，确保手动设置的主题不受影响
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') applyTheme('system')
  })
})

/** 监听 settings.theme 变化，实时应用新主题 */
watch(() => settings.theme, applyTheme)
/** 监听 settings.fontSize 变化，实时更新 CSS 变量 */
watch(() => settings.fontSize, applyFontSize)
</script>

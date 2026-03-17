/**
 * @file src/features/settings/composables/useSettingsPage.js
 * @description SettingsPage 逻辑层（可测试/可复用）
 *
 * 目标：把 700+ 行页面中的“业务逻辑”从 SFC 中剥离出来，让页面只负责：
 * - 组织 section 组件
 * - 绑定 v-model
 * - 处理少量 UI 行为
 *
 * 注意：这是 Vue3 + <script setup> 的普通 composable。
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { settings, resetSettings } from '@/stores/settings'
import { LANGUAGES } from '@/i18n'
import { useModal } from '@/composables/useModal'
import { fetchModels, sendChatMessage } from '@/services/api'
import { normalizeBaseUrl } from '@/services/apiClient'

/**
 * useSettingsPage
 * @returns {object} 暴露给 SettingsPage 的状态与方法
 */
export function useSettingsPage() {
  /** i18n：t 为翻译函数，locale 为当前语言 ref */
  const { t, locale } = useI18n()

  /** 模态确认框 */
  const { confirm } = useModal()

  // ── 页面滚动控制 ───────────────────────────────────────
  onMounted(() => {
    // 设置页允许滚动（聊天页为沉浸式布局，通常锁 scroll）
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
  })
  onUnmounted(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  })

  // ── URL 规范化预览 ─────────────────────────────────────
  /** 规范化后的 URL，当与输入不同时显示在输入框下方作为提示 */
  const normalizedUrl = ref('')

  /** 失焦时对输入的 Base URL 进行规范化处理（仅用于预览提示） */
  const showNormalized = () => {
    const n = normalizeBaseUrl(settings.apiBaseUrl)
    normalizedUrl.value = (n && n !== settings.apiBaseUrl) ? n : ''
  }

  // ── 旧接口迁移 ─────────────────────────────────────────
  /** 已知的旧接口域名列表，用于判断是否需要迁移 */
  const OLD_APIS = ['s2a.dgtw.de', 'openrouter.ai']

  /** 计算属性：检测当前 Base URL 是否包含旧接口域名 */
  const isOldApi = computed(() => OLD_APIS.some(a => settings.apiBaseUrl?.includes(a)))

  /** 一键迁移到新接口 */
  const migrateToOpenRouter = () => {
    settings.apiBaseUrl = 'https://api.yexc.top'
    settings.apiKey = 'sk-M0u9pvjqujqT5Z50qz2ek6BGzjcqUjychYq6bleeJosVokAU'
    settings.defaultModel = 'claude-sonnet-4.5'
    settings.detectedModels = []
    normalizedUrl.value = ''
  }

  // ── API Key 显示/隐藏 ─────────────────────────────────
  const showKey = ref(false)

  // ── 模型检测与分组 ─────────────────────────────────────
  const detecting = ref(false)
  const detectError = ref('')

  const openGroups = ref({})

  const groupedModels = computed(() => {
    const map = {}
    for (const m of settings.detectedModels) {
      if (!map[m.group]) map[m.group] = []
      map[m.group].push(m)
    }
    return map
  })

  const groupedEntries = computed(() => Object.entries(groupedModels.value))

  const toggleGroup = (name) => {
    openGroups.value[name] = !openGroups.value[name]
  }

  const runDetect = async () => {
    detecting.value = true
    detectError.value = ''
    try {
      const models = await fetchModels(settings.apiBaseUrl, settings.apiKey)
      if (models.length) {
        settings.detectedModels = models
        const first = models[0]?.group
        if (first) openGroups.value[first] = true
        if (!settings.defaultModel && models[0]) settings.defaultModel = models[0].id
      }
    } catch (e) {
      detectError.value = cleanError(e.message || String(e))
    } finally {
      detecting.value = false
    }
  }

  // ── 测试连接（全模型串行测试）──────────────────────────
  const testing = ref(false)
  const testStatus = ref('')
  const testError = ref('')
  const testAllResults = ref([])

  const runTestAll = async () => {
    testing.value = true
    testStatus.value = ''
    testAllResults.value = []
    testError.value = ''

    const models = (settings.detectedModels || []).map(m => m.id)
    if (!models.length) {
      testing.value = false
      return
    }

    let hasFail = false
    try {
      for (const model of models) {
        const t0 = Date.now()
        let reply = ''
        try {
          await sendChatMessage({
            messages: [{ role: 'user', content: 'Hi, reply with exactly one word: OK' }],
            model,
            temperature: 0,
            onChunk: (c) => { reply += c },
          })
          testAllResults.value.push({ model, ok: true, latency: Date.now() - t0, reply: reply.trim().slice(0, 80), error: '' })
        } catch (e) {
          hasFail = true
          testAllResults.value.push({ model, ok: false, latency: Date.now() - t0, reply: '', error: e.message || String(e) })
        }
      }

      testStatus.value = hasFail ? 'fail' : 'ok'
      if (hasFail) testError.value = '部分模型测试失败（已标红）'
    } finally {
      testing.value = false
    }
  }

  // ── 错误清洗（UI 友好）──────────────────────────────────
  const cleanError = (msg) => {
    if (!msg) return ''
    const text = String(msg).replace(/<[^>]*>/g, '').trim()
    if (text.includes('Just a moment') || text.includes('challenge') || text.includes('Cloudflare')) {
      return '该接口需要浏览器验证（Cloudflare 拦截），请直接在浏览器中访问后再试，或更换其他接口'
    }
    return text.slice(0, 120)
  }

  // ── 语言切换 ───────────────────────────────────────────
  const currentLocale = computed(() => locale.value)
  const switchLang = (code) => {
    locale.value = code
    localStorage.setItem('ai-chat-lang', code)
  }

  // ── 主题与字体选项 ─────────────────────────────────────
  const themes = [
    { value: 'light',  labelKey: 'settings.themeLight',  style: 'background:#fff;border:1px solid #ddd;' },
    { value: 'dark',   labelKey: 'settings.themeDark',   style: 'background:#1a1a1a;' },
    { value: 'system', labelKey: 'settings.themeSystem', style: 'background:linear-gradient(135deg,#fff 50%,#1a1a1a 50%);border:1px solid #ddd;' },
  ]

  const fontSizes = [
    { value: 'sm', cls: 'fs-sm' },
    { value: 'md', cls: 'fs-md' },
    { value: 'lg', cls: 'fs-lg' },
  ]

  // ── 危险操作：重置 / 清除数据 ───────────────────────────
  const confirmReset = async () => {
    const ok = await confirm({ icon: '🔄', title: t('common.reset'), message: t('settings.resetConfirm'), type: 'warning' })
    if (ok) resetSettings()
  }

  const clearData = async () => {
    const ok = await confirm({
      icon: '🗑️',
      title: t('settings.clearData'),
      message: t('settings.clearConfirm'),
      type: 'danger',
      confirmText: t('settings.clearDataBtn'),
    })
    if (ok) { localStorage.clear(); location.reload() }
  }

  return {
    t,
    settings,
    LANGUAGES,

    // url
    normalizedUrl,
    showNormalized,
    isOldApi,
    migrateToOpenRouter,

    // api key
    showKey,

    // model detect/test
    detecting,
    detectError,
    runDetect,
    testing,
    testStatus,
    testError,
    testAllResults,
    runTestAll,
    openGroups,
    groupedEntries,
    toggleGroup,
    cleanError,

    // i18n
    currentLocale,
    switchLang,

    // ui options
    themes,
    fontSizes,

    // dangerous
    confirmReset,
    clearData,
  }
}

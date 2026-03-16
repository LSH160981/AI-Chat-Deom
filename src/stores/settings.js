/**
 * 全局设置 Store（基于 localStorage 持久化）
 */
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-settings'

const defaults = {
  // API 连接
  apiBaseUrl: 'https://api.yexc.top',
  apiKey: 'sk-M0u9pvjqujqT5Z50qz2ek6BGzjcqUjychYq6bleeJosVokAU',
  detectedModels: [],       // 检测到的模型列表 [{id, name, group}]

  // 对话
  defaultModel: 'claude-sonnet-4.5',
  systemPrompt: '',
  temperature: 0.7,
  webSearchEnabled: false,
  contextLength: 20,

  // TTS
  ttsEnabled: false,
  ttsVoice: 'alloy',

  // 图片生成
  imageSize: '1024x1024',
  imageQuality: 'standard',

  // 外观
  theme: 'light',
  fontSize: 'md',
  sendOnEnter: true,
}

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...defaults }
    const parsed = JSON.parse(saved)
    // 关键字段兜底：空值或旧接口地址自动替换
    const merged = { ...defaults, ...parsed }
    const oldApis = ['https://s2a.dgtw.de', 'https://openrouter.ai']
    if (!merged.apiBaseUrl || oldApis.includes(merged.apiBaseUrl)) merged.apiBaseUrl = defaults.apiBaseUrl
    if (!merged.apiKey || merged.apiKey.startsWith('sk-e312') || !merged.apiKey) merged.apiKey = defaults.apiKey
    if (!merged.defaultModel || merged.defaultModel === 'gpt-4o-mini' || merged.defaultModel.includes(':free')) merged.defaultModel = defaults.defaultModel
    return merged
  } catch {
    return { ...defaults }
  }
}

export const settings = reactive(load())

watch(settings, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function resetSettings() {
  Object.assign(settings, defaults)
}

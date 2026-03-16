/**
 * 全局设置 Store（基于 localStorage 持久化）
 */
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-settings'

const defaults = {
  // API 连接（感谢 s2a.dgtw.de 提供免费接口，因 CF 限制默认改用 OpenRouter）
  apiBaseUrl: 'https://openrouter.ai',
  apiKey: '',
  detectedModels: [],       // 检测到的模型列表 [{id, name, group}]

  // 对话
  defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
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
    // 对关键字段做兜底：若存的是空值或旧的 s2a 地址则用 defaults 补上
    const merged = { ...defaults, ...parsed }
    if (!merged.apiBaseUrl || merged.apiBaseUrl === 'https://s2a.dgtw.de') merged.apiBaseUrl = defaults.apiBaseUrl
    if (!merged.defaultModel || merged.defaultModel === 'gpt-4o-mini') merged.defaultModel = defaults.defaultModel
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

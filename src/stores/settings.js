/**
 * 全局设置 Store（基于 localStorage 持久化）
 */
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-settings'

const defaults = {
  // API 连接
  apiBaseUrl: '',           // 用户填写的 Base URL
  apiKey: '',               // API Key
  detectedModels: [],       // 检测到的模型列表 [{id, name, group}]

  // 对话
  defaultModel: '',
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
    return saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults }
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

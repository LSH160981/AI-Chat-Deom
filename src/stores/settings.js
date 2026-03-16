/**
 * 全局设置 Store（基于 localStorage 持久化）
 */
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-settings'

const defaults = {
  // 对话
  defaultModel: 'claude-sonnet-4-5',
  systemPrompt: '',
  temperature: 0.7,
  webSearchEnabled: false,
  contextLength: 20,         // 最大携带上下文条数

  // TTS
  ttsEnabled: false,
  ttsProvider: 'openai',
  ttsVoice: 'nova',

  // 图片生成
  imageModel: 'gpt-image-1-mini',
  imageQuality: 'low',

  // 外观
  theme: 'light',            // light | dark | system
  fontSize: 'md',            // sm | md | lg
  sendOnEnter: true,

  // 关于
  puterSdkUrl: 'https://js.puter.com/v2/',
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

// 自动持久化
watch(settings, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function resetSettings() {
  Object.assign(settings, defaults)
}

/**
 * @file settings.js
 * @description 全局设置 Store（基于 localStorage 持久化）
 *
 * 使用 Vue 的 reactive() 创建响应式设置对象，并通过 watch() 自动将
 * 变更同步到 localStorage，实现跨页面刷新的持久化存储。
 *
 * 导出：
 *  - settings      响应式设置对象（直接修改属性即可，自动保存）
 *  - resetSettings 恢复所有设置为默认值的函数
 */
import { reactive, watch } from 'vue'

// TODO: 待 constants/index.js 创建后统一导入

/** localStorage 中保存设置所用的键名 */
const STORAGE_KEY = 'ai-chat-settings'

/** 默认 API 服务地址 */
const DEFAULT_API_URL = 'https://api.yexc.top'

/** 默认 API 密钥 */
const DEFAULT_API_KEY = 'sk-M0u9pvjqujqT5Z50qz2ek6BGzjcqUjychYq6bleeJosVokAU'

/** 默认模型 */
const DEFAULT_MODEL = 'claude-sonnet-4.5'

/** 需要强制替换的旧接口地址列表 */
const MIGRATE_FROM_APIS = ['https://s2a.dgtw.de', 'https://openrouter.ai']

/** 旧 API Key 前缀（需迁移） */
const MIGRATE_KEY_PREFIX = 'sk-e312'

/** 旧模型 ID（需迁移） */
const MIGRATE_OLD_MODEL = 'gpt-4o-mini'

/**
 * 默认设置值。
 * 当 localStorage 中没有数据，或字段缺失时，用此对象作为兜底。
 */
const defaults = {
  // ── API 连接 ──────────────────────────────────────────────
  /** API 服务商基础地址（会在请求时自动补全 /v1 等路径） */
  apiBaseUrl: DEFAULT_API_URL,
  /** API 密钥，sk- 开头 */
  apiKey: DEFAULT_API_KEY,
  /** 通过「检测模型」功能获取到的模型列表，格式：[{id, name, group}] */
  detectedModels: [],       // 检测到的模型列表 [{id, name, group}]

  // ── 对话 ──────────────────────────────────────────────────
  /** 对话时默认使用的模型 ID */
  defaultModel: DEFAULT_MODEL,
  /** 系统提示词（System Prompt），对所有对话生效 */
  systemPrompt: '',
  /** 温度参数，控制回复随机性（0 = 确定性最强，2 = 最随机） */
  temperature: 0.7,
  /** 是否开启联网搜索（部分服务商支持） */
  webSearchEnabled: false,
  /** 携带的历史消息轮数（上下文长度） */
  contextLength: 20,

  // ── TTS（文字转语音）──────────────────────────────────────
  /** 是否自动朗读 AI 回复 */
  ttsEnabled: false,
  /** TTS 音色名称，如 alloy / nova / echo 等 */
  ttsVoice: 'alloy',

  // ── 图片生成 ───────────────────────────────────────────────
  /** 生成图片的分辨率，如 1024x1024 */
  imageSize: '1024x1024',
  /** 图片质量：standard（标准）或 hd（高清） */
  imageQuality: 'standard',

  // ── 外观 ───────────────────────────────────────────────────
  /** 主题：light / dark / system（跟随系统） */
  theme: 'light',
  /** 字体大小：sm / md / lg */
  fontSize: 'md',
  /** 是否按 Enter 键发送消息（false 时需 Ctrl+Enter） */
  sendOnEnter: true,
}

/**
 * 从 localStorage 加载设置，并进行兜底处理。
 *
 * 处理以下情况：
 *  1. 无存储数据 → 返回默认值
 *  2. JSON 解析失败 → 返回默认值
 *  3. 旧接口地址 / 旧 key / 旧模型名 → 自动替换为新的默认值
 *
 * @returns {object} 合并后的设置对象
 */
function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // 没有已存储的数据，直接返回默认值副本
    if (!saved) return { ...defaults }
    const parsed = JSON.parse(saved)
    // 将 localStorage 中的值覆盖到默认值上（保留新增字段的默认值）
    const merged = { ...defaults, ...parsed }

    // 若 URL 为空或为旧地址，重置为新地址
    if (!merged.apiBaseUrl || MIGRATE_FROM_APIS.includes(merged.apiBaseUrl)) merged.apiBaseUrl = defaults.apiBaseUrl
    // 若 Key 为空或为旧测试 Key，重置为新 Key
    if (!merged.apiKey || merged.apiKey.startsWith(MIGRATE_KEY_PREFIX) || !merged.apiKey) merged.apiKey = defaults.apiKey
    // 若模型为空、为旧 gpt-4o-mini，或包含 :free 后缀，重置为新默认模型
    if (!merged.defaultModel || merged.defaultModel === MIGRATE_OLD_MODEL || merged.defaultModel.includes(':free')) merged.defaultModel = defaults.defaultModel
    return merged
  } catch {
    // JSON 解析出错时，回退到默认值
    return { ...defaults }
  }
}

/**
 * 全局响应式设置对象。
 *
 * 直接修改其属性（如 settings.theme = 'dark'）即可触发 UI 更新，
 * 并通过下方的 watch 自动保存到 localStorage。
 */
export const settings = reactive(load())

/**
 * 监听 settings 深层变化，自动序列化并写入 localStorage。
 * deep: true 确保嵌套属性变更也能被捕获。
 */
watch(settings, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

/**
 * 将所有设置重置为默认值。
 * 使用 Object.assign 在不替换原始响应式对象引用的前提下覆盖所有字段。
 */
export function resetSettings() {
  Object.assign(settings, defaults)
}

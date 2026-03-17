/**
 * @file constants/index.js
 * @description 应用全局常量集中管理
 * 将散落在各处的魔法字符串和硬编码值统一提取到此处
 * 修改配置时只需改这一个文件
 */

/**
 * 聊天模式枚举
 * 对应 Settings 中 mode 字段的合法取值
 * @enum {string}
 */
export const CHAT_MODE = {
  /** 普通文本对话模式 */
  CHAT: 'chat',
  /** 文本生成图片模式 */
  TXT2IMG: 'txt2img',
  /** 语音转文字模式 */
  SPEECH2TXT: 'speech2txt',
  /** 文字转语音模式 */
  TXT2SPEECH: 'txt2speech',
}

/**
 * localStorage 存储键名常量
 * 统一管理所有本地存储 key，防止拼写错误和命名冲突
 * @enum {string}
 */
export const STORAGE_KEYS = {
  /** 用户设置（API URL、Key、模型、温度等） */
  SETTINGS: 'ai-chat-settings',
  /** 界面语言偏好 */
  LANG: 'ai-chat-lang',
}

/**
 * 默认 API 配置
 * 首次使用或未配置时的默认值
 */
export const DEFAULT_API = {
  /** 默认 API 基础地址（仅作为示例/占位；实际以设置页填写为准） */
  BASE_URL: 'https://api.yexc.top',
  /** 默认使用的模型（仅示例；实际以设置页选择/填写为准） */
  MODEL: 'claude-sonnet-4.5',
  /**
   * 旧版 API 地址列表，用于数据迁移
   * 若检测到用户仍在使用这些地址，自动迁移到新地址
   */
  MIGRATE_FROM: ['https://s2a.dgtw.de', 'https://openrouter.ai'],
}

/**
 * 各类请求的超时时间（毫秒）
 * 根据不同操作的预期耗时设置合理的超时阈值
 * @enum {number}
 */
export const REQUEST_TIMEOUT = {
  /** 普通对话请求超时：60 秒 */
  CHAT: 60000,
  /** 模型/语言检测请求超时：10 秒 */
  DETECT: 10000,
  /** API 连通性测试超时：15 秒 */
  TEST: 15000,
  /** 文字转语音（TTS）请求超时：30 秒 */
  TTS: 30000,
  /** 语音转文字（STT）请求超时：30 秒 */
  STT: 30000,
  /** 图片生成请求超时：60 秒 */
  IMAGE: 60000,
}

/**
 * 应用内各类限制值
 * 用于输入校验、UI 限制等场景
 */
export const LIMITS = {
  /** 上下文轮数最小值 */
  CONTEXT_MIN: 2,
  /** 上下文轮数最大值 */
  CONTEXT_MAX: 50,
  /** 模型温度最小值 */
  TEMPERATURE_MIN: 0,
  /** 模型温度最大值 */
  TEMPERATURE_MAX: 2,
  /** TTS 单次最大字符数 */
  TTS_MAX_CHARS: 500,
  /** 错误信息最大显示长度（超出截断） */
  ERROR_MSG_MAX: 150,
}

/**
 * OpenRouter API 请求所需的鸣谢 Headers
 * 按照 OpenRouter 规范，需要在请求头中声明来源
 * @see https://openrouter.ai/docs#headers
 */
export const OPENROUTER_HEADERS = {
  /** 请求来源 URL */
  'HTTP-Referer': 'https://github.com/LSH160981/AI-Chat-Deom',
  /** 应用名称 */
  'X-Title': 'AI Chat',
}

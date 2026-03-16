/**
 * @file models.js
 * @description AI 模型列表及相关枚举配置
 *
 * 统一维护应用中所有可用的：
 *  - 对话模型列表（按服务商分组）
 *  - 图片生成模型列表
 *  - TTS 语音列表（按服务商分组）
 *  - 聊天模式列表（对话 / 文生图 / 语音转文字 / 文字转语音）
 *
 * 各组件从此文件导入，保证全局一致性。
 */

/**
 * 对话模型列表，按服务商分组。
 * 用于设置页的模型选择器（分组 <select> 或卡片列表）。
 *
 * 结构：
 *  [
 *    {
 *      label: '服务商名称',
 *      options: [{ value: 'model-id', label: '显示名称' }, ...]
 *    },
 *    ...
 *  ]
 */
export const MODEL_LIST = [
  {
    label: 'OpenAI',
    options: [
      { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'openai/gpt-4o', label: 'GPT-4o' },
      { value: 'openai/o3-mini', label: 'o3-mini (推理)' },
    ]
  },
  {
    label: 'Anthropic',
    options: [
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 ★' }, // 推荐默认模型
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { value: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
    ]
  },
  {
    label: 'Google',
    options: [
      { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ]
  },
  {
    label: 'xAI',
    options: [
      { value: 'x-ai/grok-3', label: 'Grok 3' },
      { value: 'x-ai/grok-3-mini', label: 'Grok 3 Mini' },
    ]
  },
  {
    label: 'DeepSeek',
    options: [
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
      { value: 'deepseek/deepseek-chat-v3-5', label: 'DeepSeek V3.5' },
    ]
  },
  {
    label: 'Meta',
    options: [
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (免费)' },
    ]
  },
]

/**
 * 图片生成模型列表。
 * 用于文生图模式下的模型选择。
 * 每项格式：{ value: 'model-id', label: '显示名称' }
 */
export const IMAGE_MODEL_LIST = [
  { value: 'gpt-image-1-mini', label: 'GPT Image 1 Mini' },
  { value: 'gpt-image-1', label: 'GPT Image 1' },
  { value: 'dall-e-3', label: 'DALL-E 3' },
  { value: 'grok-2-image', label: 'Grok Image (xAI)' },
  { value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash' },
]

/**
 * TTS 语音音色列表，按 TTS 服务商分组。
 *
 * 键名即服务商标识（与 API 请求参数对应），值为该服务商支持的音色列表。
 * 结构：
 *  {
 *    '服务商key': [{ value: '音色id', label: '显示名称' }, ...]
 *  }
 */
export const TTS_VOICE_MAP = {
  /** OpenAI TTS 音色 */
  openai: [
    { value: 'alloy', label: 'Alloy' },
    { value: 'nova', label: 'Nova' },
    { value: 'echo', label: 'Echo' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'shimmer', label: 'Shimmer' },
    { value: 'coral', label: 'Coral' },
  ],
  /** AWS Polly TTS 音色 */
  'aws-polly': [
    { value: 'Joanna', label: 'Joanna (英文女)' },
    { value: 'Matthew', label: 'Matthew (英文男)' },
    { value: 'Zhiyu', label: 'Zhiyu (中文女)' },
  ],
  /** ElevenLabs TTS 音色（使用音色 ID） */
  elevenlabs: [
    { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel' },
  ],
}

/**
 * 聊天功能模式列表。
 * 用于主界面底部的模式切换 Tab。
 *
 * 每项字段：
 *  - id：模式标识符，与功能路由/逻辑匹配
 *  - icon：展示用 Emoji 图标
 *  - label：模式的中文显示名称
 */
export const CHAT_MODES = [
  { id: 'chat', icon: '💬', label: 'AI 对话' },          // 普通 AI 对话模式
  { id: 'txt2img', icon: '🎨', label: '文生图' },         // 文字生成图片模式
  { id: 'speech2txt', icon: '🎙️', label: '语音转文字' }, // 录音识别模式
  { id: 'txt2speech', icon: '🔊', label: '文字转语音' },  // 文字朗读模式
]

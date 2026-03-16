/**
 * 模型列表配置
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
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 ★' },
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

export const IMAGE_MODEL_LIST = [
  { value: 'gpt-image-1-mini', label: 'GPT Image 1 Mini' },
  { value: 'gpt-image-1', label: 'GPT Image 1' },
  { value: 'dall-e-3', label: 'DALL-E 3' },
  { value: 'grok-2-image', label: 'Grok Image (xAI)' },
  { value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash' },
]

export const TTS_VOICE_MAP = {
  openai: [
    { value: 'alloy', label: 'Alloy' },
    { value: 'nova', label: 'Nova' },
    { value: 'echo', label: 'Echo' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'shimmer', label: 'Shimmer' },
    { value: 'coral', label: 'Coral' },
  ],
  'aws-polly': [
    { value: 'Joanna', label: 'Joanna (英文女)' },
    { value: 'Matthew', label: 'Matthew (英文男)' },
    { value: 'Zhiyu', label: 'Zhiyu (中文女)' },
  ],
  elevenlabs: [
    { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel' },
  ],
}

export const CHAT_MODES = [
  { id: 'chat', icon: '💬', label: 'AI 对话' },
  { id: 'txt2img', icon: '🎨', label: '文生图' },
  { id: 'speech2txt', icon: '🎙️', label: '语音转文字' },
  { id: 'txt2speech', icon: '🔊', label: '文字转语音' },
]

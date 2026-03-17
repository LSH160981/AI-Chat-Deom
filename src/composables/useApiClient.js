/**
 * @file useApiClient.js
 * @description API 客户端核心模块
 *
 * 功能概述：
 * - 智能补全 Base URL（识别服务商 → 自动拼接正确路径后缀）
 * - 检测 API 服务商类型（OpenAI / Anthropic / Gemini / Ollama 等）
 * - 构建适配各服务商的请求头
 * - 流式对话（Chat Streaming）
 * - 文生图（Image Generation）
 * - 语音转文字（Speech to Text）
 * - 文字转语音（Text to Speech）
 *
 * 兼容：OpenAI / Anthropic / Gemini / Ollama / 任意 OpenAI 兼容接口
 */
import { settings } from '@/stores/settings'

// ===== 请求超时常量（毫秒）=====
const TIMEOUT = {
  DETECT: 10000,
  CHAT:   60000,
  TTS:    30000,
  STT:    30000,
  IMAGE:  60000,
}

// ===== Cloudflare 拦截特征字符串 =====
const CF_PATTERNS = ['Just a moment', 'Cloudflare', 'challenge']

// ===== URL 智能补全规则表 =====
// 每条规则包含：match（用于匹配域名的正则）、path（该服务商 API 路径前缀）
const PROVIDER_RULES = [
  // 精确域名匹配 → 固定路径
  { match: /api\.openai\.com/,          path: '/v1' },
  { match: /api\.anthropic\.com/,       path: '/v1' },
  { match: /generativelanguage\.google/, path: '/v1beta' },
  { match: /openrouter\.ai/,            path: '/api/v1' },
  { match: /api\.groq\.com/,            path: '/openai/v1' },
  { match: /api\.deepseek\.com/,        path: '/v1' },
  { match: /api\.mistral\.ai/,          path: '/v1' },
  { match: /api\.together\.xyz/,        path: '/v1' },
  { match: /api\.perplexity\.ai/,       path: '/v1' },
  { match: /api\.cohere\.com/,          path: '/v2' },
  { match: /api\.x\.ai/,               path: '/v1' },
  { match: /dashscope\.aliyuncs\.com/,  path: '/compatible-mode/v1' },
  { match: /api\.moonshot\.cn/,         path: '/v1' },
  { match: /api\.lingyiwanwu\.com/,     path: '/v1' },
  { match: /api\.zhipuai\.cn/,          path: '/v4' },
  { match: /open\.bigmodel\.cn/,        path: '/api/paas/v4' },
  { match: /api\.siliconflow\.cn/,      path: '/v1' },
  { match: /aihubmix\.com/,             path: '/v1' },
  // Ollama 本地服务
  { match: /localhost|127\.0\.0\.1|0\.0\.0\.0/, path: '/v1' },
]

/**
 * 规范化（智能补全）API Base URL
 *
 * 逻辑说明：
 * 1. 去除首尾空白和末尾斜杠
 * 2. 如果 URL 已包含有意义的路径段（用户手动填写了 /v1 等），直接返回
 * 3. 否则根据 PROVIDER_RULES 匹配域名，追加对应路径前缀
 * 4. 都不匹配则兜底追加 /v1
 *
 * @param {string} raw - 用户输入的原始 Base URL
 * @returns {string} 规范化后的 Base URL，若输入为空则返回空字符串
 */
/**
 * 规范化（智能补全）API Base URL
 * @param {string} raw
 * @returns {string}
 */
export function normalizeBaseUrl(raw) {
  if (!raw || !raw.trim()) return ''
  let url = raw.trim().replace(/\/+$/, '') // 去尾部斜杠，避免路径拼接出现双斜杠

  // 解析 URL 的 pathname，判断用户是否已手动填写了路径
  const pathname = (() => { try { return new URL(url).pathname } catch { return '' } })()
  if (pathname && pathname !== '/') return url // 路径非空且不是根路径，用户已手动填写，直接使用

  // 遍历规则表，根据域名匹配并追加路径前缀
  for (const rule of PROVIDER_RULES) {
    if (rule.match.test(url)) return url + rule.path
  }

  // 兜底策略：未匹配任何已知服务商，默认追加 /v1（大多数 OpenAI 兼容接口均采用此路径）
  return url + '/v1'
}

/**
 * 检测 API 服务商类型
 *
 * 根据 baseUrl 的域名特征推断服务商，用于后续构建适配的请求头和请求体格式。
 *
 * @param {string} baseUrl - 规范化后的 Base URL
 * @returns {'anthropic'|'gemini'|'ollama'|'openai'} 服务商类型字符串
 */
export function detectProvider(baseUrl) {
  if (!baseUrl) return 'openai' // 无 URL 时默认按 OpenAI 兼容处理
  if (/anthropic\.com/.test(baseUrl))           return 'anthropic'
  if (/generativelanguage\.google/.test(baseUrl)) return 'gemini'
  if (/ollama|localhost|127\.0\.0\.1/.test(baseUrl)) return 'ollama'
  return 'openai' // 默认 OpenAI 兼容（涵盖 DeepSeek、Groq、OpenRouter 等）
}

/**
 * 构建 HTTP 请求头
 *
 * 根据服务商类型生成适配的 Authorization / x-api-key 等认证请求头。
 * Anthropic 使用 x-api-key 头和固定的版本号；其他服务商统一使用 Bearer Token。
 * OpenRouter 还需额外携带 Referer 和 X-Title 以满足其要求。
 *
 * @param {string} apiKey  - 用户的 API 密钥
 * @param {string} provider - 服务商类型（'anthropic' | 'openai' | 'openrouter' 等）
 * @returns {Object} 构建好的请求头对象
 */
/** buildHeaders：按 provider 构建鉴权请求头 */
export function buildHeaders(apiKey, provider) {
  const h = { 'Content-Type': 'application/json' } // 基础 JSON 请求头
  if (provider === 'anthropic') {
    // Anthropic 使用专属认证方式
    if (apiKey) h['x-api-key'] = apiKey
    h['anthropic-version'] = '2023-06-01' // Anthropic API 版本声明（必填）
  } else {
    // OpenAI 及兼容接口均使用 Bearer Token 认证
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`
  }
  // OpenRouter 需要 Referer（即使免费模型也建议加，用于统计来源）
  if (provider === 'openrouter') {
    h['HTTP-Referer'] = 'https://github.com/LSH160981/AI-Chat-Deom'
    h['X-Title'] = 'AI Chat'
  }
  return h
}

/**
 * 流式聊天请求（Chat Streaming）
 *
 * 向 AI 接口发送对话消息，以 SSE（Server-Sent Events）流式接收响应，
 * 并在每收到一个文本片段时调用 onChunk 回调实时渲染。
 *
 * 支持协议：
 * - Anthropic：使用 /messages 端点，system 消息单独提取
 * - Gemini：使用 OpenAI 兼容端点（/openai/chat/completions）
 * - OpenAI 兼容：使用 /chat/completions 端点
 *
 * @param {Object}   params             - 请求参数对象
 * @param {Array}    params.messages    - 对话消息数组，格式为 [{role, content}]
 * @param {string}   params.model       - 模型 ID
 * @param {number}   [params.temperature] - 采样温度，控制输出随机性
 * @param {AbortSignal} [params.signal] - 用于取消请求的 AbortSignal
 * @param {Function} params.onChunk     - 每收到一段文本时的回调，参数为文本片段字符串
 * @returns {Promise<void>}
 * @throws {Error} 接口返回非 2xx 状态码或流解析失败时抛出错误
 */
/**
 * chatStream（历史实现/参考）：流式聊天（SSE）
 * @param {object} params
 */
export async function chatStream({ messages, model, temperature, signal, onChunk }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl) // 规范化用户配置的 Base URL
  const apiKey  = settings.apiKey                        // 读取用户配置的 API Key
  const provider = detectProvider(baseUrl)               // 根据 URL 推断服务商

  let url, body
  if (provider === 'anthropic') {
    // Anthropic 接口格式：system 消息需从 messages 数组中提取并单独传递
    url = baseUrl + '/messages'
    const sysMsg = messages.find(m => m.role === 'system')   // 提取 system 消息
    const history = messages.filter(m => m.role !== 'system') // 排除 system，剩余为对话历史
    body = {
      model,
      max_tokens: 4096, // Anthropic 必须显式指定最大 token 数
      stream: true,
      messages: history,
      ...(sysMsg ? { system: sysMsg.content } : {}), // system 消息单独作为顶层字段
      ...(temperature != null ? { temperature } : {}),
    }
  } else if (provider === 'gemini') {
    // Gemini 通过其 OpenAI 兼容端点接入，路径为 /openai/chat/completions
    url = baseUrl + '/openai/chat/completions'
    body = { model, messages, stream: true, temperature }
  } else {
    // 标准 OpenAI 兼容接口
    url = baseUrl + '/chat/completions'
    body = { model, messages, stream: true, temperature }
  }

  // 发起 HTTP POST 请求
  const resp = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey, provider),
    body: JSON.stringify(body),
    signal, // 传入 AbortSignal，支持用户手动取消请求
  })

  // 处理非成功响应
  if (!resp.ok) {
    const err = await resp.text()
    const clean = err.replace(/<[^>]*>/g, '').trim() // 剥离 HTML 标签，提取纯文本错误信息
    // 特判 Cloudflare 拦截（返回 HTML 验证页），给出友好提示
    if (CF_PATTERNS.some(p => clean.includes(p))) {
      throw new Error(`HTTP ${resp.status}: 接口被 Cloudflare 拦截，请直接在浏览器中访问该接口地址后再试`)
    }
    throw new Error(`HTTP ${resp.status}: ${clean.slice(0, 150)}`) // 截取前150字符避免消息过长
  }

  // 解析 SSE（Server-Sent Events）流
  const reader = resp.body.getReader()    // 获取可读流的 Reader
  const decoder = new TextDecoder()       // 用于将 Uint8Array 解码为字符串
  let buf = ''                            // 行缓冲区，用于处理跨 chunk 的不完整行

  while (true) {
    const { done, value } = await reader.read() // 读取下一个 chunk
    if (done) break                              // 流结束，退出循环
    buf += decoder.decode(value, { stream: true }) // 增量解码并追加到缓冲区
    const lines = buf.split('\n')               // 按换行符拆分为行数组
    buf = lines.pop()                           // 最后一行可能不完整，保留到下次

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue // 跳过空行和结束标记
      if (!trimmed.startsWith('data: ')) continue          // 只处理 SSE data 行
      try {
        const json = JSON.parse(trimmed.slice(6)) // 去掉 "data: " 前缀后解析 JSON
        // 尝试解析 OpenAI 格式的流式响应
        const delta = json.choices?.[0]?.delta?.content
        // 尝试解析 Anthropic 格式的流式响应（content_block_delta 事件）
        const anthropicText = json.type === 'content_block_delta'
          ? json.delta?.text
          : null
        const text = delta ?? anthropicText // 优先使用 OpenAI 格式，否则用 Anthropic 格式
        if (text) onChunk(text) // 将文本片段实时传递给上层回调
      } catch { /* 跳过解析失败的行（如心跳包、注释行等） */ }
    }
  }
}

/**
 * 文生图（Image Generation）
 *
 * 调用 OpenAI 的 /images/generations 接口，根据文字描述生成图片。
 *
 * @param {Object} params           - 请求参数
 * @param {string} params.prompt    - 图片描述文本（提示词）
 * @param {string} params.model     - 使用的图像模型（如 'dall-e-3'）
 * @param {string} [params.size='1024x1024'] - 图片尺寸，格式为 'WxH'
 * @param {string} [params.quality='standard'] - 图片质量（'standard' 或 'hd'）
 * @returns {Promise<string>} 生成图片的 URL 或 base64 数据（b64_json）
 * @throws {Error} 接口返回非 2xx 状态码时抛出
 */
/**
 * generateImage（历史实现/参考）：文生图
 */
export async function generateImage({ prompt, model, size = '1024x1024', quality = 'standard' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const resp = await fetch(baseUrl + '/images/generations', {
    method: 'POST',
    headers: buildHeaders(apiKey, 'openai'), // 图像接口均使用 OpenAI 格式
    body: JSON.stringify({ prompt, model, size, quality, n: 1 }), // n: 1 表示生成1张
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  // 优先返回图片 URL，否则返回 base64 数据
  return data.data?.[0]?.url || data.data?.[0]?.b64_json
}

/**
 * 语音转文字（Speech to Text / ASR）
 *
 * 将录音 Blob 上传至 Whisper 接口进行语音识别，返回识别出的文字。
 *
 * @param {Blob} blob - 录音数据（如 audio/webm 格式的 Blob）
 * @returns {Promise<string>} 识别出的文字，若无结果则返回空字符串
 * @throws {Error} 接口返回非 2xx 状态码时抛出
 */
export async function transcribeAudio(blob) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const form = new FormData()
  form.append('file', blob, 'audio.webm') // 以 multipart/form-data 方式上传音频文件
  form.append('model', 'whisper-1')       // 指定使用 Whisper 模型
  const resp = await fetch(baseUrl + '/audio/transcriptions', {
    method: 'POST',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, // 音频接口不传 Content-Type，由 fetch 自动设置 multipart
    body: form,
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.text || '' // 返回识别文本，接口无结果时返回空字符串
}

/**
 * 文字转语音（Text to Speech / TTS）
 *
 * 将文本发送至 TTS 接口合成语音，并将返回的音频数据转为可播放的 ObjectURL。
 *
 * @param {Object} params            - 请求参数
 * @param {string} params.text       - 要转换为语音的文本内容
 * @param {string} [params.voice='alloy'] - 音色名称（如 'alloy', 'echo', 'fable' 等）
 * @param {string} [params.model='tts-1'] - TTS 模型（'tts-1' 或 'tts-1-hd'）
 * @returns {Promise<string>} 音频的 ObjectURL，可直接赋值给 <audio> 的 src
 * @throws {Error} 接口返回非 2xx 状态码时抛出
 */
/**
 * synthesizeSpeech（历史实现/参考）：文字转语音
 */
export async function synthesizeSpeech({ text, voice = 'alloy', model = 'tts-1' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const resp = await fetch(baseUrl + '/audio/speech', {
    method: 'POST',
    headers: buildHeaders(apiKey, 'openai'),
    body: JSON.stringify({ input: text, voice, model }), // input 字段为 TTS 接口要求的文本字段名
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const ab = await resp.arrayBuffer()                              // 读取二进制音频数据
  return URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' })) // 转为 ObjectURL 供播放器使用
}


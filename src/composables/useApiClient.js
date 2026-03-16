/**
 * API 客户端
 * - 智能补全 Base URL（识别服务商 → 自动加正确路径后缀）
 * - 兼容 OpenAI / Anthropic / Gemini / Ollama / 任意 OpenAI 兼容接口
 */
import { settings } from '@/stores/settings'

// ===== URL 智能补全 =====
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
  // Ollama 本地
  { match: /localhost|127\.0\.0\.1|0\.0\.0\.0/, path: '/v1' },
]

export function normalizeBaseUrl(raw) {
  if (!raw || !raw.trim()) return ''
  let url = raw.trim().replace(/\/+$/, '') // 去尾部斜杠

  // 已经包含路径段（用户手动写了 /v1 等），直接用
  const pathname = (() => { try { return new URL(url).pathname } catch { return '' } })()
  if (pathname && pathname !== '/') return url

  // 匹配规则
  for (const rule of PROVIDER_RULES) {
    if (rule.match.test(url)) return url + rule.path
  }

  // 兜底：追加 /v1
  return url + '/v1'
}

// ===== 检测服务商类型 =====
export function detectProvider(baseUrl) {
  if (!baseUrl) return 'openai'
  if (/anthropic\.com/.test(baseUrl))           return 'anthropic'
  if (/generativelanguage\.google/.test(baseUrl)) return 'gemini'
  if (/ollama|localhost|127\.0\.0\.1/.test(baseUrl)) return 'ollama'
  return 'openai' // 默认 OpenAI 兼容
}

// ===== 通用请求头（导出供 detector 使用）=====
export function buildHeaders(apiKey, provider) {
  const h = { 'Content-Type': 'application/json' }
  if (provider === 'anthropic') {
    if (apiKey) h['x-api-key'] = apiKey
    h['anthropic-version'] = '2023-06-01'
  } else {
    if (apiKey) h['Authorization'] = `Bearer ${apiKey}`
  }
  // OpenRouter 需要 Referer（即使免费模型也建议加）
  if (provider === 'openrouter') {
    h['HTTP-Referer'] = 'https://github.com/LSH160981/AI-Chat-Deom'
    h['X-Title'] = 'AI Chat'
  }
  return h
}

// ===== Chat（流式）=====
export async function chatStream({ messages, model, temperature, signal, onChunk }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const provider = detectProvider(baseUrl)

  let url, body
  if (provider === 'anthropic') {
    url = baseUrl + '/messages'
    const sysMsg = messages.find(m => m.role === 'system')
    const history = messages.filter(m => m.role !== 'system')
    body = {
      model,
      max_tokens: 4096,
      stream: true,
      messages: history,
      ...(sysMsg ? { system: sysMsg.content } : {}),
      ...(temperature != null ? { temperature } : {}),
    }
  } else if (provider === 'gemini') {
    // Gemini 用 OpenAI 兼容端点（/v1beta/openai/chat/completions）
    url = baseUrl + '/openai/chat/completions'
    body = { model, messages, stream: true, temperature }
  } else {
    url = baseUrl + '/chat/completions'
    body = { model, messages, stream: true, temperature }
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey, provider),
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) {
    const err = await resp.text()
    const clean = err.replace(/<[^>]*>/g, '').trim()
    if (clean.includes('Just a moment') || clean.includes('Cloudflare') || clean.includes('challenge')) {
      throw new Error(`HTTP ${resp.status}: 接口被 Cloudflare 拦截，请直接在浏览器中访问该接口地址后再试`)
    }
    throw new Error(`HTTP ${resp.status}: ${clean.slice(0, 150)}`)
  }

  // 解析 SSE 流
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        // OpenAI 格式
        const delta = json.choices?.[0]?.delta?.content
        // Anthropic 格式
        const anthropicText = json.type === 'content_block_delta'
          ? json.delta?.text
          : null
        const text = delta ?? anthropicText
        if (text) onChunk(text)
      } catch { /* 跳过解析失败的行 */ }
    }
  }
}

// ===== 文生图 =====
export async function generateImage({ prompt, model, size = '1024x1024', quality = 'standard' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const resp = await fetch(baseUrl + '/images/generations', {
    method: 'POST',
    headers: buildHeaders(apiKey, 'openai'),
    body: JSON.stringify({ prompt, model, size, quality, n: 1 }),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.data?.[0]?.url || data.data?.[0]?.b64_json
}

// ===== 语音转文字 =====
export async function transcribeAudio(blob) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const form = new FormData()
  form.append('file', blob, 'audio.webm')
  form.append('model', 'whisper-1')
  const resp = await fetch(baseUrl + '/audio/transcriptions', {
    method: 'POST',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    body: form,
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.text || ''
}

// ===== 文字转语音 =====
export async function synthesizeSpeech({ text, voice = 'alloy', model = 'tts-1' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const resp = await fetch(baseUrl + '/audio/speech', {
    method: 'POST',
    headers: buildHeaders(apiKey, 'openai'),
    body: JSON.stringify({ input: text, voice, model }),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const ab = await resp.arrayBuffer()
  return URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' }))
}

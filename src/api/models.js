/**
 * @file src/api/models.js
 * @description 模型列表检测 API 封装
 *
 * 调用 /models 接口获取服务商支持的模型列表。
 * - Anthropic：无公开 /models 端点，返回硬编码列表
 * - Gemini：使用其专属 REST API
 * - 其他：标准 OpenAI 兼容 /models 端点
 *
 * 返回统一格式：{ id, name, displayName, group }
 */
import { get } from './request'
import { normalizeBaseUrl, detectProvider, buildHeaders } from '@/composables/useApiClient'
import { logger } from '@/utils/logger'

const TAG = '[Models API]'

/** 检测超时（毫秒）*/
const DETECT_TIMEOUT = 10000

/** Anthropic 无公开 /models 端点，使用硬编码列表 */
const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-5',            displayName: 'Opus 4.5',      group: 'Anthropic' },
  { id: 'claude-sonnet-4-5',          displayName: 'Sonnet 4.5 ★',  group: 'Anthropic' },
  { id: 'claude-sonnet-4-6',          displayName: 'Sonnet 4.6',    group: 'Anthropic' },
  { id: 'claude-haiku-4-5',           displayName: 'Haiku 4.5',     group: 'Anthropic' },
  { id: 'claude-3-5-sonnet-20241022', displayName: '3.5 Sonnet',    group: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022',  displayName: '3.5 Haiku',     group: 'Anthropic' },
  { id: 'claude-3-opus-20240229',     displayName: '3 Opus',        group: 'Anthropic' },
].map(m => ({ ...m, name: m.id }))

/**
 * 根据模型 ID 猜测所属分组（用于非 Anthropic 的通用接口）
 * @param {string} id
 * @returns {string}
 */
function guessGroup(id = '') {
  const s = id.toLowerCase()
  if (s.startsWith('gpt') || s.startsWith('o1') || s.startsWith('o3') || s.startsWith('o4')) return 'OpenAI'
  if (s.startsWith('claude'))                       return 'Anthropic'
  if (s.startsWith('gemini'))                       return 'Google'
  if (s.startsWith('grok'))                         return 'xAI'
  if (s.startsWith('deepseek'))                     return 'DeepSeek'
  if (s.startsWith('llama') || s.startsWith('meta')) return 'Meta'
  if (s.startsWith('mistral') || s.startsWith('mixtral')) return 'Mistral'
  if (s.startsWith('qwen'))                         return 'Alibaba'
  if (s.startsWith('glm') || s.startsWith('chatglm')) return 'Zhipu'
  if (s.startsWith('moonshot') || s.startsWith('kimi')) return 'Moonshot'
  if (s.startsWith('yi-'))                          return 'Lingyiwanwu'
  if (s.startsWith('command'))                      return 'Cohere'
  if (s.startsWith('phi'))                          return 'Microsoft'
  if (s.startsWith('gemma'))                        return 'Google (Open)'
  if (s.startsWith('seedance') || s.startsWith('kimi')) return 'Moonshot'
  return 'Other'
}

/**
 * 将原始模型 ID 转为简洁的显示名
 * 如：'claude-sonnet-4.5' → 'Sonnet 4.5'，'gemini-2.5-flash' → '2.5 Flash'
 * @param {string} id
 * @returns {string}
 */
function toDisplayName(id = '') {
  const prefixes = [
    'claude-', 'gemini-', 'gpt-', 'deepseek-', 'grok-',
    'mistral-', 'mixtral-', 'llama-', 'meta-llama/', 'qwen-',
    'glm-', 'kimi-', 'moonshot-', 'yi-',
  ]
  let name = id
  for (const p of prefixes) {
    if (name.toLowerCase().startsWith(p)) { name = name.slice(p.length); break }
  }
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || id
}

/**
 * 获取可用模型列表
 *
 * @param {string} baseUrlRaw  用户填写的 Base URL（未规范化）
 * @param {string} apiKey      API Key
 * @returns {Promise<Array<{id:string, name:string, displayName:string, group:string}>>}
 * @throws {ApiError} 请求失败时抛出
 */
export async function fetchModels(baseUrlRaw, apiKey) {
  const baseUrl  = normalizeBaseUrl(baseUrlRaw)
  const provider = detectProvider(baseUrl)
  const t0 = Date.now()

  logger.info(TAG, `开始检测 | 服务商: ${provider} | URL: ${baseUrl}`)

  // Anthropic 无公开 /models 端点，直接返回硬编码列表
  if (provider === 'anthropic') {
    logger.info(TAG, `Anthropic 使用硬编码列表，共 ${ANTHROPIC_MODELS.length} 个模型`)
    return ANTHROPIC_MODELS
  }

  // Gemini 使用其专属 REST API（需要在 URL 中传入 apiKey）
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const data = await get(url, {
      signal: AbortSignal.timeout(DETECT_TIMEOUT),
    })
    const models = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.name.replace('models/', ''),
        displayName: m.displayName || m.name.replace('models/', ''),
        group: 'Google Gemini',
      }))
    logger.info(TAG, `Gemini 检测完成 | ${models.length} 个模型 | 耗时: ${Date.now() - t0}ms`)
    return models
  }

  // OpenAI 兼容接口（DeepSeek / Groq / OpenRouter / 自定义等）
  const headers = {}
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  // OpenRouter 需要额外的 Referer header
  if (/openrouter\.ai/.test(baseUrl)) {
    headers['HTTP-Referer'] = 'https://github.com/LSH160981/AI-Chat-Deom'
    headers['X-Title'] = 'AI Chat'
  }

  const data = await get(baseUrl + '/models', {
    headers,
    signal: AbortSignal.timeout(DETECT_TIMEOUT),
  })

  const raw = data.data || data.models || []
  const models = raw
    .map(m => {
      const id = m.id || m.name
      const group = guessGroup(id)
      return { id, name: id, displayName: toDisplayName(id, group), group }
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.displayName.localeCompare(b.displayName))

  logger.info(TAG, `检测完成 | ${models.length} 个模型 | 耗时: ${Date.now() - t0}ms`)
  return models
}

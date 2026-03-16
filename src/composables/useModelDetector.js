/**
 * 自动检测可用模型列表
 * 调用 /models 接口，兼容 OpenAI / Ollama / Anthropic / Gemini
 */
import { ref } from 'vue'
import { normalizeBaseUrl, detectProvider, buildHeaders } from './useApiClient'
import { settings } from '@/stores/settings'

export function useModelDetector() {
  const detecting = ref(false)
  const error = ref('')

  /**
   * 检测可用模型
   * @returns {Promise<Array<{id, name, group}>>}
   */
  const detect = async (baseUrlRaw, apiKey) => {
    detecting.value = true
    error.value = ''
    const baseUrl = normalizeBaseUrl(baseUrlRaw)
    const provider = detectProvider(baseUrl)

    try {
      let models = []

      if (provider === 'anthropic') {
        // Anthropic 没有公开 /models，返回硬编码列表
        models = ANTHROPIC_MODELS
      } else if (provider === 'gemini') {
        // Gemini REST API
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: AbortSignal.timeout(10000) }
        )
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        models = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name,
            group: 'Google Gemini',
          }))
      } else {
        // OpenAI 兼容（OpenAI / Ollama / OpenRouter / DeepSeek …）
        const headers = {}
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
        const resp = await fetch(baseUrl + '/models', {
          headers,
          signal: AbortSignal.timeout(10000),
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        const raw = data.data || data.models || []
        models = raw
          .map(m => ({
            id: m.id || m.name,
            name: m.id || m.name,
            group: guessGroup(m.id || m.name),
          }))
          .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
      }

      return models
    } catch (e) {
      error.value = e.message || String(e)
      return []
    } finally {
      detecting.value = false
    }
  }

  return { detect, detecting, error }
}

// ===== 辅助：按模型名猜分组 =====
function guessGroup(id = '') {
  const s = id.toLowerCase()
  if (s.startsWith('gpt') || s.startsWith('o1') || s.startsWith('o3') || s.startsWith('o4') || s.includes('openai')) return 'OpenAI'
  if (s.startsWith('claude'))   return 'Anthropic'
  if (s.startsWith('gemini'))   return 'Google'
  if (s.startsWith('grok'))     return 'xAI'
  if (s.startsWith('deepseek')) return 'DeepSeek'
  if (s.startsWith('llama') || s.startsWith('meta')) return 'Meta'
  if (s.startsWith('mistral') || s.startsWith('mixtral')) return 'Mistral'
  if (s.startsWith('qwen'))     return 'Alibaba'
  if (s.startsWith('glm') || s.startsWith('chatglm')) return 'Zhipu'
  if (s.startsWith('moonshot') || s.startsWith('kimi')) return 'Moonshot'
  if (s.startsWith('yi-'))      return 'Lingyiwanwu'
  if (s.startsWith('command'))  return 'Cohere'
  if (s.startsWith('phi'))      return 'Microsoft'
  if (s.startsWith('gemma'))    return 'Google (Open)'
  return 'Other'
}

// Anthropic 硬编码（官方无公开 /models 端点）
const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-5',           name: 'Claude Opus 4.5',    group: 'Anthropic' },
  { id: 'claude-sonnet-4-5',         name: 'Claude Sonnet 4.5 ★', group: 'Anthropic' },
  { id: 'claude-haiku-4-5',          name: 'Claude Haiku 4.5',   group: 'Anthropic' },
  { id: 'claude-3-5-sonnet-20241022',name: 'Claude 3.5 Sonnet',  group: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku',   group: 'Anthropic' },
  { id: 'claude-3-opus-20240229',    name: 'Claude 3 Opus',      group: 'Anthropic' },
]

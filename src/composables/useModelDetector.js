/**
 * @file useModelDetector.js
 * @description 自动检测 API 服务商可用模型列表的 Vue Composable
 *
 * 功能概述：
 * - 根据用户配置的 baseUrl 和 apiKey，自动调用对应服务商的模型列表接口
 * - 兼容 OpenAI 兼容接口 / Ollama / OpenRouter / Anthropic（硬编码）/ Gemini（REST API）
 * - 返回统一格式的模型列表：[{ id, name, displayName, group }]
 * - 提供 detecting（加载状态）和 error（错误信息）响应式状态
 *
 * 使用方式：
 *   const { detect, detecting, error } = useModelDetector()
 *   const models = await detect(baseUrl, apiKey)
 */
import { ref } from 'vue'
import { normalizeBaseUrl, detectProvider, buildHeaders } from './useApiClient'
import { settings } from '@/stores/settings'

// ===== 请求超时常量（毫秒）=====
const TIMEOUT = {
  DETECT: 10000,
}

// ===== Cloudflare 拦截特征字符串 =====
const CF_PATTERNS = ['Just a moment', 'challenge', 'Cloudflare']

/**
 * 判断错误消息是否为 Cloudflare 拦截
 * @param {string} msg
 * @returns {boolean}
 */
function isCFBlock(msg) {
  return CF_PATTERNS.some(p => msg.includes(p))
}

/**
 * 模型检测 Composable
 *
 * @returns {{
 *   detect: Function,
 *   detecting: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string>
 * }}
 */
export function useModelDetector() {
  const detecting = ref(false) // 是否正在检测中（用于控制 UI 加载状态）
  const error = ref('')        // 最近一次检测的错误信息，无错误时为空字符串

  /**
   * 检测指定 API 配置的可用模型列表
   *
   * 根据 baseUrl 推断服务商类型，分别调用：
   * - Anthropic：返回硬编码的模型列表（官方无公开 /models 端点）
   * - Gemini：调用 Google 官方 REST API 获取支持文本生成的模型
   * - OpenAI 兼容（OpenAI / Ollama / OpenRouter 等）：调用 /models 端点
   *
   * @param {string} baseUrlRaw - 用户输入的原始 Base URL（会自动规范化）
   * @param {string} apiKey     - API 密钥
   * @returns {Promise<Array<{id: string, name: string, displayName: string, group: string}>>}
   *          模型列表，检测失败时返回空数组
   */
  const detect = async (baseUrlRaw, apiKey) => {
    detecting.value = true // 标记开始检测
    error.value = ''       // 清空上次的错误信息
    const baseUrl = normalizeBaseUrl(baseUrlRaw) // 规范化 Base URL
    const provider = detectProvider(baseUrl)     // 推断服务商类型

    try {
      let models = []

      if (provider === 'anthropic') {
        // Anthropic 官方没有公开的 /models 端点，使用硬编码的已知模型列表
        models = ANTHROPIC_MODELS
      } else if (provider === 'gemini') {
        // Gemini 使用独立的 REST API 获取模型列表（与 OpenAI 兼容端点不同）
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: AbortSignal.timeout(TIMEOUT.DETECT) } // 设置超时
        )
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        models = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent')) // 只保留支持文本生成的模型
          .map(m => ({
            id: m.name.replace('models/', ''), // 去掉 "models/" 前缀，只保留模型名
            name: m.displayName || m.name,
            group: 'Google Gemini',
          }))
      } else {
        // OpenAI 兼容接口（OpenAI / Ollama / OpenRouter / DeepSeek 等）
        const headers = {}
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}` // 有 API Key 时加认证头
        const resp = await fetch(baseUrl + '/models', {
          headers,
          signal: AbortSignal.timeout(TIMEOUT.DETECT), // 设置超时，避免卡死
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        const raw = data.data || data.models || [] // 兼容不同格式：OpenAI 用 data、部分接口用 models
        models = raw
          .map(m => {
            const id = m.id || m.name // 兼容 id 或 name 字段
            const group = guessGroup(id) // 根据模型 ID 推断所属厂商分组
            return {
              id,
              name: id,
              displayName: toDisplayName(id, group), // 生成对用户友好的显示名
              group,
            }
          })
          .sort((a, b) => a.group.localeCompare(b.group) || a.displayName.localeCompare(b.displayName))
          // 先按分组字母序排列，同组内再按显示名字母序排列
      }

      return models
    } catch (e) {
      const msg = String(e.message || e)
      // 特殊处理 Cloudflare 验证拦截，给出可操作的提示
      if (isCFBlock(msg)) {
        error.value = '该接口需要浏览器验证（Cloudflare），请直接在浏览器中访问后再试，或更换接口'
      } else {
        error.value = msg.replace(/<[^>]*>/g, '').slice(0, 120) // 剥离 HTML 标签，截取前 120 字符
      }
      return [] // 出错时返回空列表，不影响 UI 正常显示
    } finally {
      detecting.value = false // 无论成功还是失败，都关闭加载状态
    }
  }

  return { detect, detecting, error }
}

// ===== 辅助函数：生成对用户友好的模型显示名 =====

/**
 * 将模型 ID 转换为友好的显示名称
 *
 * 去掉常见的厂商前缀（如 "claude-"、"gpt-"），
 * 然后将剩余部分的连字符替换为空格，并对每个单词首字母大写。
 *
 * @param {string} id    - 模型 ID，如 'claude-3-5-sonnet-20241022'
 * @param {string} group - 所属分组（暂未使用，保留用于扩展）
 * @returns {string} 友好的显示名称，如 '3 5 Sonnet 20241022'
 */
function toDisplayName(id = '', group = '') {
  // 定义需要去掉的厂商名称前缀列表
  const prefixes = [
    'claude-', 'gemini-', 'gpt-', 'deepseek-', 'grok-',
    'mistral-', 'mixtral-', 'llama-', 'meta-llama/', 'qwen-',
    'glm-', 'kimi-', 'moonshot-', 'yi-',
  ]
  let name = id
  for (const p of prefixes) {
    if (name.toLowerCase().startsWith(p)) {
      name = name.slice(p.length) // 找到匹配前缀后去掉，只保留一次
      break
    }
  }
  // 连字符替换为空格，并将每个单词首字母大写
  name = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return name || id // 若处理结果为空，降级返回原始 ID
}

// ===== 辅助函数：根据模型 ID 推断所属厂商分组 =====

/**
 * 根据模型 ID 猜测所属厂商分组
 *
 * 用于在模型选择下拉框中对模型进行分组显示。
 *
 * @param {string} id - 模型 ID（不区分大小写匹配）
 * @returns {string} 分组名称（如 'OpenAI'、'Anthropic'、'Google' 等）
 */
function guessGroup(id = '') {
  const s = id.toLowerCase() // 统一转小写，方便比较
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
  return 'Other' // 未识别的模型归入 Other 分组
}

// ===== Anthropic 硬编码模型列表 =====
// 原因：Anthropic 官方未提供公开的 /models 接口，此处维护已知可用模型
const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-5',           name: 'claude-opus-4-5',           displayName: 'Opus 4.5',      group: 'Anthropic' },
  { id: 'claude-sonnet-4-5',         name: 'claude-sonnet-4-5',         displayName: 'Sonnet 4.5 ★',  group: 'Anthropic' }, // ★ 表示推荐首选
  { id: 'claude-haiku-4-5',          name: 'claude-haiku-4-5',          displayName: 'Haiku 4.5',     group: 'Anthropic' },
  { id: 'claude-3-5-sonnet-20241022',name: 'claude-3-5-sonnet-20241022',displayName: '3.5 Sonnet',    group: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku-20241022', displayName: '3.5 Haiku',     group: 'Anthropic' },
  { id: 'claude-3-opus-20240229',    name: 'claude-3-opus-20240229',    displayName: '3 Opus',        group: 'Anthropic' },
]

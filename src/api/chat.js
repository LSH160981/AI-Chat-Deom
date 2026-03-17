/**
 * @file src/api/chat.js
 * @description 聊天 API 封装
 *
 * 负责：
 *  - 根据服务商类型构建适配的请求体（Anthropic / Gemini / OpenAI 兼容）
 *  - 调用流式请求底层，实时回传文字片段
 *  - 打印详细日志：模型、消息数、TTFB、总耗时、总字数
 */
import { postStream } from './request'
import { normalizeBaseUrl, detectProvider, buildHeaders } from '@/composables/useApiClient'
import { settings } from '@/stores/settings'
import { logger } from '@/utils/logger'

const TAG = '[Chat API]'

/**
 * 发送流式聊天消息
 *
 * @param {object}      params
 * @param {Array<{role:string, content:string}>} params.messages    对话历史
 * @param {string}      params.model        模型 ID（如 'claude-sonnet-4.5'）
 * @param {number}      [params.temperature] 温度（0~2），控制随机性
 * @param {AbortSignal} [params.signal]     取消信号，用于中断请求
 * @param {function(string):void} params.onChunk   每收到文字片段的回调
 * @returns {Promise<void>}
 * @throws {ApiError} 请求失败、超时、CF 拦截时抛出
 */
export async function sendChatMessage({ messages, model, temperature, signal, onChunk }) {
  const baseUrl  = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey   = settings.apiKey
  const provider = detectProvider(baseUrl)

  logger.info(TAG, `发送请求 | 模型: ${model} | 消息数: ${messages.length} | 服务商: ${provider}`)

  let url, body

  if (provider === 'anthropic') {
    // Anthropic 格式：system 消息需从数组中提取，单独作为顶层字段
    url = baseUrl + '/messages'
    const sysMsg  = messages.find(m => m.role === 'system')
    const history = messages.filter(m => m.role !== 'system')
    body = {
      model,
      max_tokens: 4096,
      stream: true,
      messages: history,
      ...(sysMsg        ? { system: sysMsg.content } : {}),
      ...(temperature != null ? { temperature }      : {}),
    }
  } else if (provider === 'gemini') {
    // Gemini 使用其 OpenAI 兼容端点
    url  = baseUrl + '/openai/chat/completions'
    body = { model, messages, stream: true, temperature }
  } else {
    // 标准 OpenAI 兼容格式（DeepSeek / Groq / OpenRouter 等）
    url  = baseUrl + '/chat/completions'
    body = { model, messages, stream: true, temperature }
  }

  await postStream(url, body, {
    headers: buildHeaders(apiKey, provider),
    signal,
    onChunk,
  })
}

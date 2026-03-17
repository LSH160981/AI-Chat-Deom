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
/** sendChatMessage：统一聊天流式请求入口（Anthropic/Gemini/OpenAI兼容） */
export async function sendChatMessage({ messages, model, temperature, signal, onChunk }) {
  // 规范化 Base URL，确保不会出现 ".../v1/v1" 或尾部多余斜杠
  const baseUrl  = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey   = settings.apiKey
  // 根据 URL 自动推断 provider（anthropic / gemini / openai-compatible）
  const provider = detectProvider(baseUrl)

  logger.info(TAG, `发送请求 | 模型: ${model} | 消息数: ${messages.length} | 服务商: ${provider}`)

  let url, body

  if (provider === 'anthropic') {
    // Anthropic：
    // - 端点：/messages
    // - system 提示词不是 messages 数组的一项，需要单独放到顶层字段 system
    url = baseUrl + '/messages'

    const sysMsg  = messages.find(m => m.role === 'system')
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
    // Gemini：走 OpenAI 兼容端点
    // 注意：Gemini 原生接口与 OpenAI 不同，这里使用其兼容层以复用 SSE 解析逻辑
    url  = baseUrl + '/openai/chat/completions'
    body = { model, messages, stream: true, temperature }
  } else {
    // OpenAI 兼容：/chat/completions
    // 适配：OpenAI / DeepSeek / Groq / OpenRouter / 自建中转
    url  = baseUrl + '/chat/completions'
    body = { model, messages, stream: true, temperature }
  }

  // 统一走 postStream：
  // - 会以 SSE 方式读取响应流
  // - 并在每个 data: chunk 到达时回调 onChunk(text)
  await postStream(url, body, {
    headers: buildHeaders(apiKey, provider),
    signal,
    onChunk,
  })
}

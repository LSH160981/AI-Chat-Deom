/**
 * @file src/api/request.js
 * @description 底层 HTTP 请求封装
 *
 * 职责：
 *  - 统一的请求/响应日志（tag、方法、URL、状态码、耗时）
 *  - 统一的错误格式 ApiError（code / message / status / raw）
 *  - Cloudflare 拦截特判，给出人类可读的错误提示
 *  - 支持 JSON POST、流式 SSE POST、FormData POST、GET
 */
import { logger } from '@/utils/logger'

// ===== Cloudflare 拦截特征 =====
const CF_PATTERNS = ['Just a moment', 'Cloudflare', 'challenge']

/**
 * 判断文本是否为 Cloudflare Bot Challenge 响应
 * @param {string} text
 * @returns {boolean}
 */
function isCFBlock(text) {
  return CF_PATTERNS.some(p => text.includes(p))
}

/**
 * 统一 API 错误类
 * @property {string} code    错误码（如 'HTTP_ERROR' / 'NETWORK_ERROR' / 'TIMEOUT' / 'CF_BLOCK'）
 * @property {number} status  HTTP 状态码（网络错误时为 0）
 * @property {string} raw     原始错误文本（截短后）
 */
export class ApiError extends Error {
  /**
   * @param {object} opts
   * @param {string} opts.code
   * @param {string} opts.message
   * @param {number} [opts.status]
   * @param {string} [opts.raw]
   */
  constructor({ code, message, status = 0, raw = '' }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.raw = raw
  }
}

/**
 * 解析非 2xx 响应，抛出 ApiError
 * @param {Response} resp
 * @param {string} tag  日志标签
 */
async function throwForStatus(resp, tag) {
  const text = await resp.text().catch(() => '')
  const clean = text.replace(/<[^>]*>/g, '').trim()
  logger.error(tag, `HTTP ${resp.status}`, clean.slice(0, 200))

  if (isCFBlock(clean)) {
    throw new ApiError({
      code: 'CF_BLOCK',
      message: `接口被 Cloudflare 拦截（HTTP ${resp.status}），请用浏览器直接访问该地址完成验证后再试`,
      status: resp.status,
      raw: clean.slice(0, 150),
    })
  }
  throw new ApiError({
    code: 'HTTP_ERROR',
    message: `请求失败（HTTP ${resp.status}）：${clean.slice(0, 100) || '服务器无响应'}`,
    status: resp.status,
    raw: clean.slice(0, 150),
  })
}

/**
 * 包装 fetch，统一处理网络错误和超时
 * @param {string} tag
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function safeFetch(tag, url, init) {
  try {
    return await fetch(url, init)
  } catch (e) {
    if (e.name === 'AbortError') {
      logger.warn(tag, '请求已取消或超时', url)
      throw new ApiError({ code: 'TIMEOUT', message: '请求超时或已取消', status: 0 })
    }
    logger.error(tag, '网络错误', url, e.message)
    throw new ApiError({ code: 'NETWORK_ERROR', message: `网络错误：${e.message}`, status: 0 })
  }
}

/**
 * GET 请求
 * @param {string} url
 * @param {object} [opts]
 * @param {HeadersInit} [opts.headers]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<any>} 解析后的 JSON
 */
export async function get(url, { headers = {}, signal } = {}) {
  const tag = '[API GET]'
  const t0 = Date.now()
  logger.debug(tag, url)
  const resp = await safeFetch(tag, url, { method: 'GET', headers, signal })
  logger.info(tag, url, resp.status, `${Date.now() - t0}ms`)
  if (!resp.ok) await throwForStatus(resp, tag)
  return resp.json()
}

/**
 * POST JSON 请求
 * @param {string} url
 * @param {object} body
 * @param {object} [opts]
 * @param {HeadersInit} [opts.headers]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<any>}
 */
export async function post(url, body, { headers = {}, signal } = {}) {
  const tag = '[API POST]'
  const t0 = Date.now()
  logger.debug(tag, url, body)
  const resp = await safeFetch(tag, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  logger.info(tag, url, resp.status, `${Date.now() - t0}ms`)
  if (!resp.ok) await throwForStatus(resp, tag)
  return resp.json()
}

/**
 * POST FormData 请求（用于文件上传）
 * @param {string} url
 * @param {FormData} formData
 * @param {object} [opts]
 * @param {HeadersInit} [opts.headers]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<any>}
 */
export async function postForm(url, formData, { headers = {}, signal } = {}) {
  const tag = '[API FORM]'
  const t0 = Date.now()
  logger.debug(tag, url, '(FormData)')
  const resp = await safeFetch(tag, url, {
    method: 'POST',
    headers, // 不设 Content-Type，让浏览器自动加 multipart boundary
    body: formData,
    signal,
  })
  logger.info(tag, url, resp.status, `${Date.now() - t0}ms`)
  if (!resp.ok) await throwForStatus(resp, tag)
  return resp.json()
}

/**
 * POST 流式 SSE 请求
 * @param {string} url
 * @param {object} body
 * @param {object} opts
 * @param {HeadersInit} opts.headers
 * @param {AbortSignal} [opts.signal]
 * @param {function(string):void} opts.onChunk  每收到文本片段时的回调
 * @returns {Promise<{totalChars: number, latencyMs: number}>}
 */
export async function postStream(url, body, { headers = {}, signal, onChunk } = {}) {
  const tag = '[API STREAM]'
  const t0 = Date.now()
  let ttfb = null  // Time to First Byte（首字节延迟）
  let totalChars = 0
  logger.debug(tag, url, { model: body.model, msgCount: body.messages?.length })

  const resp = await safeFetch(tag, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })

  if (!resp.ok) await throwForStatus(resp, tag)
  logger.info(tag, url, resp.status, `连接建立 ${Date.now() - t0}ms`)

  // 解析 SSE 流
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() // 最后一行可能不完整，保留到下次

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        // OpenAI 格式
        const delta = json.choices?.[0]?.delta?.content
        // Anthropic 格式
        const anthropicText = json.type === 'content_block_delta' ? json.delta?.text : null
        const text = delta ?? anthropicText
        if (text) {
          if (ttfb === null) {
            ttfb = Date.now() - t0
            logger.debug(tag, `首字节延迟 ${ttfb}ms`)
          }
          totalChars += text.length
          onChunk(text)
        }
      } catch { /* 跳过心跳包、注释行等无法解析的行 */ }
    }
  }

  const totalMs = Date.now() - t0
  logger.info(tag, `完成 | 模型: ${body.model} | 共 ${totalChars} 字 | 耗时 ${totalMs}ms | TTFB ${ttfb}ms`)
  return { totalChars, latencyMs: totalMs }
}

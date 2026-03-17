/**
 * @file useError.js
 * @description 统一错误处理 Composable Hook
 *
 * 提供以下能力：
 * - cleanErrorMessage(e)         清洗错误信息（去 HTML 标签、识别 CF 拦截、截短超长文本）
 * - handleApiError(e)            将错误转换为用户友好的提示字符串
 * - withErrorHandling(fn, opts)  包装异步函数，自动捕获并处理错误
 *
 * 使用示例：
 * ```js
 * import { useError } from '@/hooks/useError'
 *
 * const { handleApiError, withErrorHandling, lastError } = useError()
 *
 * // 包装 API 调用
 * const result = await withErrorHandling(
 *   () => fetchData(),
 *   { fallback: null, onError: (msg) => toast.error(msg) }
 * )
 * ```
 */

import { ref } from 'vue'
import { logger } from '@/utils/logger'
import { LIMITS } from '@/constants'

/**
 * 判断错误是否由 Cloudflare 拦截导致
 * CF 拦截页面通常包含特定关键词
 * @param {string} text - 错误文本
 * @returns {boolean}
 */
function isCloudflareBlock(text) {
  const cfKeywords = [
    'cloudflare',
    'cf-ray',
    'attention required',
    'sorry, you have been blocked',
    'enable javascript and cookies',
    '1020',
  ]
  const lower = text.toLowerCase()
  return cfKeywords.some((kw) => lower.includes(kw))
}

/**
 * 从字符串中去除 HTML 标签
 * @param {string} str - 含 HTML 的字符串
 * @returns {string} 纯文本
 */
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * 统一错误处理 Composable
 * @returns {{
 *   lastError: import('vue').Ref<string|null>,
 *   cleanErrorMessage: (e: unknown) => string,
 *   handleApiError: (e: unknown) => string,
 *   withErrorHandling: (fn: Function, opts?: object) => Promise<*>
 * }}
 */
/**
 * useError：统一错误处理 Hook。
 *
 * @returns {{
 *   lastError: import('vue').Ref<string|null>,
 *   cleanErrorMessage: (e: unknown) => string,
 *   handleApiError: (e: unknown) => string,
 *   withErrorHandling: (fn: Function, opts?: { fallback?: any, onError?: (msg: string)=>void }) => Promise<any>
 * }}
 */
export function useError() {
  /**
   * 最近一次错误信息，可在模板中直接绑定展示
   * @type {import('vue').Ref<string|null>}
   */
  const lastError = ref(null)

  /**
   * 清洗错误信息
   * 处理流程：提取文本 → 去除 HTML → 识别特殊错误 → 截断超长内容
   * @param {unknown} e - 捕获到的错误（Error 对象、字符串、响应对象等）
   * @returns {string} 清洗后的错误文本
   */
  function cleanErrorMessage(e) {
    let msg = ''

    if (!e) return '发生未知错误'

    // 提取原始错误文本
    if (typeof e === 'string') {
      msg = e
    } else if (e instanceof Error) {
      msg = e.message || e.toString()
    } else if (e?.message) {
      msg = String(e.message)
    } else if (e?.error) {
      // OpenAI 风格：{ error: { message: '...' } }
      msg = typeof e.error === 'string' ? e.error : e.error?.message || JSON.stringify(e.error)
    } else {
      try {
        msg = JSON.stringify(e)
      } catch {
        msg = String(e)
      }
    }

    // 去除 HTML 标签（部分 API 错误页包含 HTML）
    if (msg.includes('<')) {
      // 识别 Cloudflare 拦截
      if (isCloudflareBlock(msg)) {
        return 'Cloudflare 安全拦截：请检查 API 地址是否正确，或稍后重试'
      }
      msg = stripHtml(msg)
    }

    // 截断超长错误信息
    if (msg.length > LIMITS.ERROR_MSG_MAX) {
      msg = msg.slice(0, LIMITS.ERROR_MSG_MAX) + '...'
    }

    return msg || '发生未知错误'
  }

  /**
   * 将 API 错误转换为用户友好的提示字符串
   * 识别常见错误类型（网络、鉴权、限流、超时等）并给出友好提示
   * @param {unknown} e - 捕获到的错误
   * @returns {string} 用户友好的错误提示
   */
  function handleApiError(e) {
    logger.error('useError', '捕获到 API 错误:', e)

    const msg = cleanErrorMessage(e)
    const lower = msg.toLowerCase()

    // 网络连接失败
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network error') ||
      lower.includes('err_connection_refused')
    ) {
      return '网络连接失败，请检查网络或 API 地址是否可访问'
    }

    // 请求超时
    if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
      return '请求超时，请检查网络状况后重试'
    }

    // 鉴权失败（401）
    if (
      lower.includes('401') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid api key') ||
      lower.includes('authentication')
    ) {
      return 'API Key 无效或已过期，请在设置中重新配置'
    }

    // 权限不足（403）
    if (lower.includes('403') || lower.includes('forbidden')) {
      return '无访问权限，请检查 API Key 是否有权使用该模型'
    }

    // 限流（429）
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
      return '请求频率超限，请稍后重试'
    }

    // 服务端错误（5xx）
    if (
      lower.includes('500') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('internal server error') ||
      lower.includes('bad gateway')
    ) {
      return 'API 服务暂时不可用，请稍后重试'
    }

    // 模型不存在
    if (lower.includes('model') && (lower.includes('not found') || lower.includes('does not exist'))) {
      return '指定的模型不存在，请在设置中更换模型'
    }

    // 上下文超长
    if (lower.includes('context length') || lower.includes('maximum context') || lower.includes('too long')) {
      return '对话内容过长，请减少上下文轮数或开启新对话'
    }

    // 返回清洗后的原始消息（已截断）
    return msg
  }

  /**
   * 包装异步函数，自动捕获并处理错误
   * @param {Function} fn - 要执行的异步函数
   * @param {object} [opts={}] - 配置选项
   * @param {*} [opts.fallback=null] - 出错时的返回值
   * @param {Function} [opts.onError] - 错误回调，接收友好错误字符串
   * @param {boolean} [opts.rethrow=false] - 是否在处理后重新抛出错误
   * @returns {Promise<*>} 函数执行结果，出错时返回 fallback
   */
  async function withErrorHandling(fn, opts = {}) {
    const { fallback = null, onError, rethrow = false } = opts

    try {
      lastError.value = null
      return await fn()
    } catch (e) {
      const friendlyMsg = handleApiError(e)
      lastError.value = friendlyMsg

      if (typeof onError === 'function') {
        onError(friendlyMsg)
      }

      if (rethrow) throw e

      return fallback
    }
  }

  return {
    lastError,
    cleanErrorMessage,
    handleApiError,
    withErrorHandling,
  }
}

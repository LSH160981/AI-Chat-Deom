/**
 * @file format.js
 * @description 格式化相关工具函数集合
 * 提供文件大小、时长、字符串截断、HTML 转义等常用格式化能力
 */

/**
 * 将字节数格式化为人类可读的文件大小字符串
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小，如 "1.23 MB"
 * @example
 * formatFileSize(1024)       // "1.00 KB"
 * formatFileSize(1048576)    // "1.00 MB"
 * formatFileSize(0)          // "0 B"
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  if (!bytes || isNaN(bytes) || bytes < 0) return '未知大小'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const index = Math.min(i, units.length - 1)

  if (index === 0) return `${bytes} B`
  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
}

/**
 * 将毫秒数转换为 mm:ss 格式的时长字符串
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的时长，如 "03:45"
 * @example
 * formatDuration(65000)  // "01:05"
 * formatDuration(3600000) // "60:00"
 * formatDuration(0)      // "00:00"
 */
export function formatDuration(ms) {
  if (!ms || isNaN(ms) || ms < 0) return '00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${mm}:${ss}`
}

/**
 * 截断字符串，超出长度时在末尾添加省略号
 * @param {string} str - 原始字符串
 * @param {number} len - 最大长度（含省略号）
 * @param {string} [ellipsis='...'] - 省略号字符，默认为 '...'
 * @returns {string} 截断后的字符串
 * @example
 * truncate('Hello World', 8)     // "Hello..."
 * truncate('Hi', 10)             // "Hi"
 * truncate('', 10)               // ""
 */
/** truncate：截断字符串 */
export function truncate(str, len, ellipsis = '...') {
  if (!str || typeof str !== 'string') return ''
  if (len <= 0) return ''
  if (str.length <= len) return str

  const cutLen = len - ellipsis.length
  if (cutLen <= 0) return ellipsis.slice(0, len)
  return str.slice(0, cutLen) + ellipsis
}

/**
 * 转义 HTML 特殊字符，防止 XSS 注入
 * 将 &, <, >, ", ' 转义为对应的 HTML 实体
 * @param {string} str - 待转义的字符串
 * @returns {string} 转义后的安全字符串
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
/**
 * 转义 HTML 特殊字符（XSS 防护）。
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return ''

  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return str.replace(/[&<>"']/g, (char) => escapeMap[char])
}
]/g, (char) => escapeMap[char])
}

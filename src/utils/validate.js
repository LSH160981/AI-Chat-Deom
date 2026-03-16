/**
 * @file validate.js
 * @description 数据校验工具函数集合
 * 提供 URL 格式验证、API Key 格式验证、空值检测等常用校验能力
 */

/**
 * 验证字符串是否为合法的 URL 格式
 * 支持 http 和 https 协议
 * @param {string} url - 待验证的 URL 字符串
 * @returns {boolean} 是否为合法 URL
 * @example
 * isValidUrl('https://api.openai.com')  // true
 * isValidUrl('http://localhost:3000')   // true
 * isValidUrl('not-a-url')              // false
 * isValidUrl('')                        // false
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 简单验证 API Key 是否非空且格式合理
 * 要求：非空字符串，去除首尾空格后长度 >= 8，不包含空格
 * @param {string} key - 待验证的 API Key
 * @returns {boolean} 是否为合法 API Key 格式
 * @example
 * isValidApiKey('sk-abc123456789')  // true
 * isValidApiKey('')                  // false
 * isValidApiKey('short')             // false
 * isValidApiKey('has space key')     // false
 */
export function isValidApiKey(key) {
  if (!key || typeof key !== 'string') return false

  const trimmed = key.trim()
  // 最短 8 位，且不包含空白字符
  return trimmed.length >= 8 && !/\s/.test(trimmed)
}

/**
 * 检测值是否为空（null、undefined、空字符串、纯空白字符串）
 * @param {*} val - 待检测的值
 * @returns {boolean} 是否为空值
 * @example
 * isEmpty(null)        // true
 * isEmpty(undefined)   // true
 * isEmpty('')          // true
 * isEmpty('   ')       // true
 * isEmpty(0)           // false
 * isEmpty(false)       // false
 * isEmpty('hello')     // false
 */
export function isEmpty(val) {
  if (val === null || val === undefined) return true
  if (typeof val === 'string') return val.trim() === ''
  return false
}

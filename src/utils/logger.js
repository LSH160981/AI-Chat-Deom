/**
 * @file logger.js
 * @description 统一日志工具
 * 替代项目中直接使用 console.log/error 的场景
 * 开发环境（import.meta.env.DEV 为 true）正常输出日志
 * 生产环境静默，避免将调试信息泄露给用户
 *
 * 使用方式：
 * import { logger } from '@/utils/logger'
 * logger.info('AppInit', '应用初始化完成', { version: '1.0.0' })
 * logger.error('ApiCall', '请求失败', error)
 */

/**
 * 判断当前是否为开发环境
 * 兼容处理：Vite 项目中 import.meta.env.DEV 为布尔值
 * 若 import.meta 不可用（如单元测试环境），降级为 NODE_ENV 判断
 * @returns {boolean} 是否为开发环境
 */
function isDev() {
  try {
    return import.meta.env.DEV === true
  } catch {
    // 非 Vite 环境降级处理
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  }
}

/**
 * 格式化日志前缀，统一输出格式
 * @param {string} level - 日志级别 (INFO/WARN/ERROR/DEBUG)
 * @param {string} tag - 模块标签，方便定位日志来源
 * @returns {string} 格式化后的前缀字符串
 */
function formatPrefix(level, tag) {
  const time = new Date().toTimeString().slice(0, 8)
  return `[${time}] [${level}] [${tag}]`
}

/**
 * 输出 INFO 级别日志（蓝色）
 * 用于一般性信息记录，如功能初始化、状态变更等
 * @param {string} tag - 模块/功能标签，如 'ChatStore'、'ApiClient'
 * @param {...*} args - 其余日志内容
 */
function info(tag, ...args) {
  if (!isDev()) return
  console.info(`%c${formatPrefix('INFO', tag)}`, 'color: #409eff', ...args)
}

/**
 * 输出 WARN 级别日志（橙色）
 * 用于不影响功能但需要关注的情况，如参数缺失、降级处理等
 * @param {string} tag - 模块/功能标签
 * @param {...*} args - 其余日志内容
 */
function warn(tag, ...args) {
  if (!isDev()) return
  console.warn(`%c${formatPrefix('WARN', tag)}`, 'color: #e6a23c', ...args)
}

/**
 * 输出 ERROR 级别日志（红色）
 * 用于记录错误和异常，即使在生产环境也应考虑上报
 * 注意：当前实现在生产环境同样静默，如需上报请在调用处单独处理
 * @param {string} tag - 模块/功能标签
 * @param {...*} args - 其余日志内容（通常包含 Error 对象）
 */
function error(tag, ...args) {
  if (!isDev()) return
  console.error(`%c${formatPrefix('ERROR', tag)}`, 'color: #f56c6c', ...args)
}

/**
 * 输出 DEBUG 级别日志（灰色）
 * 用于详细的调试信息，仅在开发阶段使用
 * @param {string} tag - 模块/功能标签
 * @param {...*} args - 其余日志内容
 */
function debug(tag, ...args) {
  if (!isDev()) return
  console.debug(`%c${formatPrefix('DEBUG', tag)}`, 'color: #909399', ...args)
}

/**
 * 统一日志工具对象
 * @type {{ info: Function, warn: Function, error: Function, debug: Function }}
 */
export const logger = {
  info,
  warn,
  error,
  debug,
}

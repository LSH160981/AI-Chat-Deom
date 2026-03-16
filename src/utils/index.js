/**
 * @file index.js
 * @description utils 统一导出入口
 * 从这里导入所有工具函数，避免分散引用各子模块
 *
 * 使用示例：
 * import { formatFileSize, isValidUrl, storage, logger } from '@/utils'
 */

// 格式化工具：formatFileSize / formatDuration / truncate / escapeHtml
export * from './format'

// 校验工具：isValidUrl / isValidApiKey / isEmpty
export * from './validate'

// localStorage 安全封装
export { storage } from './storage'

// 统一日志工具
export { logger } from './logger'

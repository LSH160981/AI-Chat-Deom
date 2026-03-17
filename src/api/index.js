/**
 * @file src/api/index.js
 * @description API 层统一导出入口
 *
 * 使用方式：
 *   import { sendChatMessage, generateImage, transcribeAudio, synthesizeSpeech, fetchModels } from '@/api'
 *   import { ApiError } from '@/api'
 */

export { sendChatMessage }              from './chat'
export { generateImage }                from './image'
export { transcribeAudio, synthesizeSpeech } from './audio'
export { fetchModels }                  from './models'
export { ApiError }                     from './request'

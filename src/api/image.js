/**
 * @file src/api/image.js
 * @description 文生图 API 封装
 *
 * 调用 /images/generations 接口，根据提示词生成图片。
 * 打印日志：提示词（截短）、模型、尺寸、耗时。
 */
import { post } from './request'
import { normalizeBaseUrl, buildHeaders } from '@/composables/useApiClient'
import { settings } from '@/stores/settings'
import { logger } from '@/utils/logger'

const TAG = '[Image API]'

/**
 * 文字生成图片
 *
 * @param {object} params
 * @param {string} params.prompt           图片描述（提示词）
 * @param {string} params.model            图像模型 ID（如 'dall-e-3'）
 * @param {string} [params.size='1024x1024'] 图片尺寸，格式 'WxH'
 * @param {string} [params.quality='standard'] 质量（'standard' | 'hd'）
 * @returns {Promise<string>} 生成图片的 URL 或 base64 数据
 * @throws {ApiError} 请求失败时抛出
 */
export async function generateImage({ prompt, model, size = '1024x1024', quality = 'standard' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey

  logger.info(TAG, `生成图片 | 模型: ${model} | 尺寸: ${size} | 提示: ${prompt.slice(0, 50)}...`)
  const t0 = Date.now()

  const data = await post(
    baseUrl + '/images/generations',
    { prompt, model, size, quality, n: 1 },
    { headers: buildHeaders(apiKey, 'openai') },
  )

  logger.info(TAG, `生成完成 | 耗时: ${Date.now() - t0}ms`)

  // 优先返回 URL，否则返回 base64 数据
  const result = data.data?.[0]?.url || data.data?.[0]?.b64_json
  if (!result) throw new Error('[Image API] 接口返回数据异常：无图片 URL 或 base64')
  return result
}

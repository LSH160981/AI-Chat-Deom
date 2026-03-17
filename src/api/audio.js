/**
 * @file src/api/audio.js
 * @description 语音 API 封装（STT + TTS）
 *
 * - transcribeAudio：语音转文字（调用 Whisper 接口）
 * - synthesizeSpeech：文字转语音（调用 TTS 接口，返回可播放的 ObjectURL）
 *
 * 日志：STT 打出文件大小和耗时；TTS 打出文本长度、声音、耗时。
 */
import { postForm, post } from './request'
import { normalizeBaseUrl, buildHeaders } from '@/composables/useApiClient'
import { settings } from '@/stores/settings'
import { logger } from '@/utils/logger'

const TAG_STT = '[STT API]'
const TAG_TTS = '[TTS API]'

/**
 * 语音转文字（Speech to Text）
 *
 * 将音频 Blob/File 上传至 Whisper 接口进行识别，返回识别文本。
 *
 * @param {Blob|File} audioFile  录音数据
 * @returns {Promise<string>}    识别出的文字，无结果时返回空字符串
 * @throws {ApiError}            请求失败时抛出
 */
export async function transcribeAudio(audioFile) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey
  const sizeMB  = (audioFile.size / 1024 / 1024).toFixed(2)

  logger.info(TAG_STT, `开始转写 | 文件大小: ${sizeMB}MB`)
  const t0 = Date.now()

  const form = new FormData()
  form.append('file', audioFile, 'audio.webm') // multipart 上传，固定文件名
  form.append('model', 'whisper-1')

  const data = await postForm(
    baseUrl + '/audio/transcriptions',
    form,
    { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} },
  )

  logger.info(TAG_STT, `转写完成 | 耗时: ${Date.now() - t0}ms | 文字: ${data.text?.length ?? 0} 字`)
  return data.text || ''
}

/**
 * 文字转语音（Text to Speech）
 *
 * 将文本发送至 TTS 接口合成语音，返回可直接赋给 <audio src> 的 ObjectURL。
 *
 * @param {object} params
 * @param {string} params.text           要合成的文本
 * @param {string} [params.voice='alloy'] 声音（alloy / nova / echo / onyx / shimmer / coral）
 * @param {string} [params.model='tts-1'] TTS 模型（'tts-1' | 'tts-1-hd'）
 * @returns {Promise<string>}             音频 ObjectURL
 * @throws {ApiError}                     请求失败时抛出
 */
export async function synthesizeSpeech({ text, voice = 'alloy', model = 'tts-1' }) {
  const baseUrl = normalizeBaseUrl(settings.apiBaseUrl)
  const apiKey  = settings.apiKey

  logger.info(TAG_TTS, `开始合成 | 声音: ${voice} | 模型: ${model} | 文本: ${text.length} 字`)
  const t0 = Date.now()

  // TTS 接口返回的是二进制音频数据，不能用 post()（post() 会 .json()）
  const { ApiError } = await import('./request')
  const resp = await fetch(baseUrl + '/audio/speech', {
    method: 'POST',
    headers: buildHeaders(apiKey, 'openai'),
    body: JSON.stringify({ input: text, voice, model }),
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    logger.error(TAG_TTS, `HTTP ${resp.status}`, errText.slice(0, 100))
    throw new ApiError({
      code: 'HTTP_ERROR',
      message: `TTS 合成失败（HTTP ${resp.status}）`,
      status: resp.status,
    })
  }

  const ab  = await resp.arrayBuffer()
  const url = URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' }))

  logger.info(TAG_TTS, `合成完成 | 耗时: ${Date.now() - t0}ms | 音频大小: ${(ab.byteLength / 1024).toFixed(1)}KB`)
  return url
}

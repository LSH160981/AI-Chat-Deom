/**
 * @file useRecorder.js
 * @description 麦克风录音功能 Composable
 *
 * 功能概述：
 * - 请求用户麦克风权限并开始录音
 * - 录音结束后将音频数据收集为 Blob 对象，通过回调传递给调用方
 * - 提供 isRecording 响应式状态，供 UI 实时反映录音中/停止状态
 * - 录音结束后自动释放麦克风资源（停止所有音轨）
 *
 * 使用方式：
 *   const { isRecording, startRecording, stopRecording } = useRecorder()
 *
 *   // 开始录音，停止后自动调用回调并传入音频 Blob
 *   await startRecording(async (blob) => {
 *     const text = await transcribeAudio(blob) // 例：发送给语音识别接口
 *   })
 *
 *   // 停止录音（触发上面的回调）
 *   stopRecording()
 */
import { ref } from 'vue'

/**
 * 录音 Composable
 *
 * @returns {{
 *   isRecording: import('vue').Ref<boolean>,
 *   startRecording: Function,
 *   stopRecording: Function
 * }}
 */
export function useRecorder() {
  const isRecording = ref(false) // 响应式状态：当前是否正在录音（用于 UI 状态切换）
  let mediaRecorder = null       // MediaRecorder 实例，在 start/stop 之间保持引用
  let audioChunks = []           // 录音数据片段数组，每次 ondataavailable 事件追加一个 Blob

  /**
   * 开始录音
   *
   * 请求麦克风权限，创建 MediaRecorder 并开始录制音频。
   * 录音过程中每次产生数据都会追加到 audioChunks 数组。
   * 录音停止后（调用 stopRecording 触发），将所有片段合并为完整的 audio/webm Blob，
   * 并调用 onStop 回调传递给调用方处理（如上传识别、保存等）。
   *
   * @param {Function} onStop - 录音停止后的异步回调，接收一个 Blob 参数（音频数据，格式为 audio/webm）
   * @returns {Promise<void>} 获取麦克风权限后 resolve；若权限被拒绝则抛出错误
   * @throws {DOMException} 用户拒绝麦克风权限时抛出 NotAllowedError
   */
  const startRecording = async (onStop) => {
    // 请求麦克风权限并获取音频流（仅请求音频，不需要视频）
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = [] // 清空上次录音的数据，防止混入旧数据

    // 创建 MediaRecorder 实例，绑定到麦克风音频流
    mediaRecorder = new MediaRecorder(stream)

    // 每当录音器生成一个数据块时触发，将数据追加到数组
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)

    // 录音停止后触发（由 stop() 调用引发）
    mediaRecorder.onstop = async () => {
      // 释放麦克风资源（停止所有音轨，关闭麦克风占用指示灯）
      stream.getTracks().forEach(t => t.stop())
      // 将所有数据片段合并为一个完整的 WebM 格式音频 Blob
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      // 调用上层提供的回调，传入完整音频数据
      await onStop(blob)
    }

    mediaRecorder.start()      // 开始录音
    isRecording.value = true   // 更新响应式状态，通知 UI 进入录音中状态
  }

  /**
   * 停止录音
   *
   * 调用 MediaRecorder 的 stop() 方法，触发 onstop 回调。
   * 会自动收集剩余数据、释放麦克风，并执行 startRecording 传入的 onStop 回调。
   */
  const stopRecording = () => {
    mediaRecorder?.stop()      // 安全调用：若 mediaRecorder 为 null 则什么都不做
    isRecording.value = false  // 立即更新 UI 状态，无需等待 onstop 回调完成
  }

  return { isRecording, startRecording, stopRecording }
}

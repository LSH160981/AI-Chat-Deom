/**
 * 录音功能（共享）
 */
import { ref } from 'vue'

export function useRecorder() {
  const isRecording = ref(false)
  let mediaRecorder = null
  let audioChunks = []

  const startRecording = async (onStop) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      await onStop(blob)
    }
    mediaRecorder.start()
    isRecording.value = true
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    isRecording.value = false
  }

  return { isRecording, startRecording, stopRecording }
}

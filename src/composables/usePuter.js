/**
 * Puter.ai SDK loader
 * 全局单例，确保 SDK 只加载一次
 */
import { ref, onMounted } from 'vue'

let puterInstance = null
const ready = ref(false)

export function usePuter() {
  onMounted(() => {
    if (window.puter) {
      puterInstance = window.puter
      ready.value = true
      return
    }
    const s = document.createElement('script')
    s.src = 'https://js.puter.com/v2/'
    s.onload = () => {
      puterInstance = window.puter
      ready.value = true
    }
    document.head.appendChild(s)
  })

  return { puter: () => puterInstance, ready }
}

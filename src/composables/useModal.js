/**
 * 全局弹窗（替代 confirm / alert）
 * 用法：
 *   const { confirm, alert } = useModal()
 *   await confirm({ title: '...', message: '...' })  // 返回 true/false
 *   await alert({ title: '...', message: '...' })
 */
import { ref, reactive } from 'vue'

const state = reactive({
  visible: false,
  title: '',
  message: '',
  icon: '',
  type: 'default',
  confirmText: '',
  cancelText: '',
  showCancel: true,
})

let _resolve = null

export function useModal() {
  const show = (opts) => {
    Object.assign(state, {
      visible: true,
      title: opts.title || '',
      message: opts.message || '',
      icon: opts.icon || '',
      type: opts.type || 'default',
      confirmText: opts.confirmText || '',
      cancelText: opts.cancelText || '',
      showCancel: opts.showCancel !== false,
    })
    return new Promise((resolve) => {
      _resolve = resolve
    })
  }

  const onConfirm = () => {
    state.visible = false
    _resolve?.(true)
  }

  const onCancel = () => {
    state.visible = false
    _resolve?.(false)
  }

  const confirm = (opts) => show({ showCancel: true, ...opts })
  const alert = (opts) => show({ showCancel: false, ...opts })

  return { state, confirm, alert, onConfirm, onCancel }
}

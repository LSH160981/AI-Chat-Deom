/**
 * @file useModal.js
 * @description 全局弹窗管理 Composable（替代原生 confirm / alert）
 *
 * 功能概述：
 * - 提供自定义样式的确认框（confirm）和提示框（alert）
 * - 基于 Promise 的异步接口，使用方式与原生 confirm/alert 类似
 * - 使用全局单例 state 管理弹窗状态，避免多实例冲突
 * - 支持自定义标题、消息、图标、按钮文字等选项
 *
 * 使用方式：
 *   const { confirm, alert } = useModal()
 *   const result = await confirm({ title: '确认删除', message: '此操作不可撤销' })
 *   // result 为 true（用户点击确认）或 false（用户点击取消/关闭）
 *   await alert({ title: '操作成功', message: '数据已保存' })
 */
import { ref, reactive } from 'vue'

/**
 * 全局弹窗状态（单例 reactive 对象）
 *
 * 所有调用 useModal() 的组件共享同一个 state，
 * 确保同一时刻只有一个弹窗处于显示状态。
 *
 * @property {boolean} visible      - 弹窗是否可见
 * @property {string}  title        - 弹窗标题
 * @property {string}  message      - 弹窗正文内容
 * @property {string}  icon         - 图标（如 emoji 或图标类名）
 * @property {string}  type         - 弹窗类型，用于控制样式（'default'|'danger'|'warning' 等）
 * @property {string}  confirmText  - 确认按钮文字（空时使用组件默认值）
 * @property {string}  cancelText   - 取消按钮文字（空时使用组件默认值）
 * @property {boolean} showCancel   - 是否显示取消按钮（alert 模式不显示）
 */
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

// 全局 Promise resolve 函数引用，在弹窗关闭时调用以传递用户的选择结果
let _resolve = null

/**
 * 全局弹窗 Composable
 *
 * @returns {{
 *   state: Object,
 *   confirm: Function,
 *   alert: Function,
 *   onConfirm: Function,
 *   onCancel: Function
 * }}
 */
/**
 * 全局弹窗 Composable。
 *
 * 说明：
 * - 内部是一个单例 reactive state（见文件顶部 state）
 * - confirm/alert 都返回 Promise<boolean>
 *
 * @returns {{
 *   state: any,
 *   confirm: (opts: object) => Promise<boolean>,
 *   alert: (opts: object) => Promise<boolean>,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }}
 */
/** @returns {{ state:any, confirm:Function, alert:Function, onConfirm:Function, onCancel:Function }} */
export function useModal() {
  /**
   * 显示弹窗（内部基础方法）
   *
   * 将传入的选项合并到全局 state 并将弹窗设为可见，
   * 返回一个 Promise，在用户点击确认或取消后 resolve。
   *
   * @param {Object}  opts              - 弹窗配置选项
   * @param {string}  [opts.title]      - 弹窗标题
   * @param {string}  [opts.message]    - 正文内容
   * @param {string}  [opts.icon]       - 图标
   * @param {string}  [opts.type]       - 弹窗类型（影响样式）
   * @param {string}  [opts.confirmText] - 确认按钮文字
   * @param {string}  [opts.cancelText]  - 取消按钮文字
   * @param {boolean} [opts.showCancel=true] - 是否显示取消按钮
   * @returns {Promise<boolean>} 用户点击确认返回 true，取消/关闭返回 false
   */
  const show = (opts) => {
    // 将选项合并到全局 state，未传的字段使用默认值
    Object.assign(state, {
      visible: true,
      title: opts.title || '',
      message: opts.message || '',
      icon: opts.icon || '',
      type: opts.type || 'default',
      confirmText: opts.confirmText || '',
      cancelText: opts.cancelText || '',
      showCancel: opts.showCancel !== false, // 默认显示取消按钮
    })
    // 返回 Promise，保存 resolve 引用供 onConfirm/onCancel 调用
    return new Promise((resolve) => {
      _resolve = resolve
    })
  }

  /**
   * 处理用户点击"确认"按钮的事件
   *
   * 关闭弹窗并将 Promise resolve 为 true。
   * 由弹窗组件模板中的确认按钮调用。
   */
  const onConfirm = () => {
    state.visible = false // 隐藏弹窗
    _resolve?.(true)      // 通知等待方：用户确认了
  }

  /**
   * 处理用户点击"取消"按钮（或关闭弹窗）的事件
   *
   * 关闭弹窗并将 Promise resolve 为 false。
   * 由弹窗组件模板中的取消按钮或遮罩层点击事件调用。
   */
  const onCancel = () => {
    state.visible = false // 隐藏弹窗
    _resolve?.(false)     // 通知等待方：用户取消了
  }

  /**
   * 显示确认框（有确认和取消两个按钮）
   *
   * 包装 show()，强制启用取消按钮。
   *
   * @param {Object} opts - 弹窗配置（同 show() 参数）
   * @returns {Promise<boolean>} 确认返回 true，取消返回 false
   */
  const confirm = (opts) => show({ showCancel: true, ...opts })

  /**
   * 显示提示框（仅有确认按钮，无取消）
   *
   * 包装 show()，强制隐藏取消按钮，适用于纯信息提示场景。
   *
   * @param {Object} opts - 弹窗配置（同 show() 参数）
   * @returns {Promise<boolean>} 用户点击确认后返回 true
   */
  const alert = (opts) => show({ showCancel: false, ...opts })

  /**
   * prompt：带输入框的弹窗（用于重命名等场景）
   * @param {Object} opts
   * @returns {Promise<string|null>} 确认返回字符串，取消返回 null
   */
  const prompt = (opts) => show({
    showCancel: true,
    showInput: true,
    confirmText: opts?.confirmText || '保存',
    cancelText: opts?.cancelText || '取消',
    ...opts,
  })

  return { state, confirm, alert, prompt, onConfirm, onCancel }
}

/**
 * @file usePuter.js
 * @description Puter.ai SDK 动态加载 Composable
 *
 * 功能概述：
 * - 以全局单例方式加载 Puter.js SDK（确保 SDK 脚本只被插入 DOM 一次）
 * - 若 SDK 已通过其他方式加载（window.puter 已存在），直接复用，不重复请求
 * - 提供 ready 响应式状态，供组件在 SDK 加载完成后执行依赖操作
 * - 提供 puter() 访问器获取 Puter 实例
 *
 * Puter.ai 简介：
 * Puter 是一个云端操作系统平台，其 JS SDK 提供文件存储、AI 接口、用户认证等能力。
 *
 * 使用方式：
 *   const { puter, ready } = usePuter()
 *
 *   // 在模板中监听 ready，或在 watch 中等待 ready 变为 true 后使用 puter()
 *   watch(ready, (isReady) => {
 *     if (isReady) {
 *       puter().ai.chat('Hello!').then(console.log)
 *     }
 *   })
 */
import { ref, onMounted } from 'vue'

// ===== 模块级单例变量 =====

/**
 * Puter SDK 实例引用（模块级单例）
 * 所有调用 usePuter() 的组件共享同一个实例，避免重复加载
 * @type {Object|null}
 */
let puterInstance = null

/**
 * SDK 是否已就绪的响应式状态（模块级，跨组件共享）
 * 任何组件都可以通过 ready.value 判断 SDK 是否可用
 * @type {import('vue').Ref<boolean>}
 */
const ready = ref(false)

/**
 * Puter SDK 加载 Composable
 *
 * 在组件挂载（onMounted）时尝试加载 Puter SDK：
 * - 若 window.puter 已存在（SDK 已加载）：直接标记 ready
 * - 若不存在：动态创建 <script> 标签异步加载 SDK，加载完成后标记 ready
 *
 * 注意：多个组件同时使用时，后续组件挂载时 window.puter 已存在，
 * 会直接走第一个分支，不会重复添加 script 标签。
 *
 * @returns {{
 *   puter: () => Object|null,
 *   ready: import('vue').Ref<boolean>
 * }}
 */
export function usePuter() {
  onMounted(() => {
    // 检查 SDK 是否已通过其他途径加载（如 HTML 中的 <script> 标签）
    if (window.puter) {
      puterInstance = window.puter // 直接引用已存在的实例
      ready.value = true           // 标记 SDK 已就绪
      return
    }

    // SDK 尚未加载，动态创建 script 标签进行异步加载
    const s = document.createElement('script')
    s.src = 'https://js.puter.com/v2/' // Puter SDK CDN 地址
    s.onload = () => {
      puterInstance = window.puter // SDK 加载完成，获取全局实例
      ready.value = true           // 通知所有监听 ready 的组件 SDK 可用了
    }
    document.head.appendChild(s) // 插入到 <head>，触发脚本下载和执行
  })

  return {
    /**
     * 获取 Puter SDK 实例
     *
     * @returns {Object|null} Puter 实例，SDK 未加载完成时返回 null
     */
    puter: () => puterInstance,
    ready, // 响应式状态，可在模板或 watch 中监听
  }
}

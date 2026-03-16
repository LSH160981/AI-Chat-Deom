/**
 * @file router/index.js
 * @description Vue Router 路由配置
 *
 * 定义应用的页面路由映射：
 *  - /          → AIChat 主对话页
 *  - /settings  → SettingsPage 设置页
 *
 * 使用 createWebHistory 模式（HTML5 History API），
 * 支持 BASE_URL 环境变量以适配非根路径部署。
 */
import { createRouter, createWebHistory } from 'vue-router'
import AIChat from '../components/AIChat.vue'
import SettingsPage from '../components/SettingsPage.vue'

/**
 * 创建路由实例。
 * history 使用 HTML5 History 模式，避免 URL 中出现 # 号。
 * BASE_URL 由 Vite 注入（vite.config.js 中的 base 配置）。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',           // 根路径
      name: 'chat',        // 路由命名，供 router-link / router.push 使用
      component: AIChat    // 主聊天页面组件
    },
    {
      path: '/settings',      // 设置页路径
      name: 'settings',       // 路由命名
      component: SettingsPage // 设置页面组件
    }
  ]
})

export default router

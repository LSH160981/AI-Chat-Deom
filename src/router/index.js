/**
 * @file router/index.js
 * @description Vue Router 路由配置
 *
 * 路由映射：
 *  - /          → ChatPage  主聊天页
 *  - /settings  → SettingsPage 设置页
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import ChatPage from '@/views/ChatPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'

const router = createRouter({
  // GitHub Pages 刷新子路由会 404，使用 hash 路由最省事
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatPage,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
    },
  ],
})

export default router

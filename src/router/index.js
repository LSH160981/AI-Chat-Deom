import { createRouter, createWebHistory } from 'vue-router'
import AIChat from '../components/AIChat.vue'
import SettingsPage from '../components/SettingsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: AIChat
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage
    }
  ]
})

export default router

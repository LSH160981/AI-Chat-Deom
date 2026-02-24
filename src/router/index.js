import { createRouter, createWebHistory } from 'vue-router'
import AIChat from '../components/AIChat.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: AIChat
    }
  ]
})

export default router

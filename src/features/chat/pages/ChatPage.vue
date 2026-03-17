<!--
  ============================================================
  文件说明：ChatPage.vue（主页）
  功能：应用主入口组件（仅保留对话功能）。
  包含：
    - 侧边栏（AppSidebar）展开/收起 + 会话管理
    - 聊天消息流式收发、多轮上下文管理
    - 模型选择（顶部）
    - 设置入口（右上角）
  依赖：AppSidebar、ChatView、useModal、settings store
  ============================================================
-->
<template>
  <div class="chat-app">
    <!-- 侧边栏：传入 open 状态 + 会话管理 -->
    <AppSidebar
      :open="sidebarOpen"
      :sessions="sessions"
      :activeSessionId="activeSessionId"
      @selectSession="selectSession"
      @renameSession="renameSession"
      @deleteSession="deleteSession"
      @close="sidebarOpen = false"
      @newChat="createNewSession"
    />

    <!-- 遮罩层：侧边栏打开时显示，点击关闭侧边栏 -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <!-- 顶部导航栏 -->
      <header class="topbar">
        <!-- 汉堡菜单按钮：切换侧边栏开关 -->
        <button class="icon-btn topbar-menu-btn" @click="sidebarOpen = !sidebarOpen" :title="$t('common.menu')">
          <AppIcon name="menu" :size="18" />
        </button>
        <!-- 标题（单一对话模式不再单独展示） -->
        <div class="topbar-title-row">

          <!-- 模型选择 -->
          <FancySelect
            v-if="settings.detectedModels?.length"
            class="topbar-model-fancy"
            :modelValue="selectedModel"
            @update:modelValue="(v) => selectedModel = v"
            :items="modelSelectItems"
            placeholder="选择模型"
          />

          <input
            v-else
            class="topbar-model-input"
            :value="selectedModel"
            @input="selectedModel = $event.target.value"
            placeholder="模型ID…"
          />
        </div>
        <!-- 设置入口：右上角 -->
        <router-link class="icon-btn" to="/settings" :title="$t('common.settings')">
          <AppIcon name="settings" :size="16" />
        </router-link>


      </header>

      <!-- 未配置 API 时的引导提示 -->
      <div v-if="!settings.apiBaseUrl" class="no-api-banner">
        <div class="no-api-inner">
          <span>⚙️</span>
          <span>请先在<router-link to="/settings">设置</router-link>中填写 API 地址和密钥</span>
        </div>
      </div>

      <!--
        聊天视图：模式为 chat 时渲染
        ref="chatViewRef" 用于父组件调用子组件暴露的方法（滚动/聚焦/重置）
      -->
      <ChatView
        ref="chatViewRef"
        :messages="messages"
        :isLoading="isLoading"
        v-model="userInput"
        @send="sendMessage"
        @clear="newChat"
        @stop="stopGenerating"
        @regenerate="regenerateLast"
      />

    </main>

  </div>
</template>

<script setup>
/**
 * @file src/features/chat/pages/ChatPage.vue
 * @description 聊天页（UI 组织层）
 *
 * 说明：
 * - 页面负责布局/组件拼装；
 * - 业务逻辑在 useChatPage 中统一维护（会话管理、流式发送、停止/重试等）。
 */

import AppSidebar from '@/features/chat/components/AppSidebar.vue'
import ChatView from '@/features/chat/components/ChatView.vue'
import FancySelect from '@/components/ui/FancySelect.vue'

import { useChatPage } from '@/features/chat/composables/useChatPage'

import { useI18n } from 'vue-i18n'
import { settings } from '@/stores/settings'

const { t } = useI18n()

const {
  // ui
  sidebarOpen,
  selectedModel,

  // models
  modelSelectItems,

  // sessions
  sessions,
  activeSessionId,
  selectSession,
  renameSession,
  deleteSession,
  createNewSession,

  // chat
  messages,
  userInput,
  isLoading,
  chatViewRef,
  sendMessage,
  stopGenerating,
  regenerateLast,
  newChat,
} = useChatPage()
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';
@import '@/styles/app.css';

.no-api-banner { background: rgba(96,165,250,0.1); border-bottom: 1px solid rgba(96,165,250,0.3); padding: 8px 20px; }
.no-api-inner { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); max-width: 760px; margin: 0 auto; }
.no-api-inner a { color: #60a5fa; text-decoration: none; font-weight: 500; }
.no-api-inner a:hover { text-decoration: underline; }
</style>
tyle>

tyle>

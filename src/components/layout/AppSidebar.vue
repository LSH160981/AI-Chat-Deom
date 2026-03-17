<!--
  ============================================================
  文件说明：AppSidebar.vue
  功能：应用左侧边栏组件，提供以下功能：
    1. 功能模式切换（聊天 / 文生图 / 语音转文字 / 文字转语音）
    2. 底部跳转设置页面入口

  说明：
    - 模型选择已移动到主页顶部（AI 对话标题旁）
    - 系统提示词仅在设置页维护（侧边栏不再提供快捷编辑）
  该组件通过 v-model:xxx 双向绑定与父组件（AIChat）同步状态。
  ============================================================
-->
<template>
  <!-- sidebar：根据 open prop 动态添加 open 类控制展开/收起 -->
  <aside class="sidebar" :class="{ open: open }">
    <!-- 侧边栏顶部：品牌 logo + 新建对话按钮 -->
    <div class="sidebar-header">
      <span class="logo">✦ AI Chat</span>
      <!-- 新建对话按钮：emit 通知父组件清空会话 -->
      <button class="icon-btn" @click="$emit('newChat')" :title="$t('common.newChat')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 功能切换列表：遍历 CHAT_MODES 配置生成按钮 -->
    <div class="mode-list">
      <button
        v-for="m in CHAT_MODES"
        :key="m.id"
        class="mode-item"
        :class="{ active: currentMode === m.id }"
        @click="$emit('update:currentMode', m.id); $emit('close')"
      >
        <!-- 模式图标 -->
        <span class="mode-icon">{{ m.icon }}</span>
        <!-- 模式名称（i18n） -->
        <span>{{ $t('modes.' + m.id) }}</span>
      </button>
    </div>

    <div class="sidebar-divider"></div>

    <!-- 底部：跳转设置页面入口 -->
    <div class="sidebar-bottom">
      <!-- RouterLink：点击跳转 /settings 并关闭侧边栏 -->
      <RouterLink to="/settings" class="settings-link" @click="$emit('close')">
        <!-- 齿轮图标（全局 AppIcon） -->
        <AppIcon name="settings" :size="15" />
        {{ $t('common.settings') }}
      </RouterLink>
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { CHAT_MODES } from '@/constants/models'

/**
 * Props 定义
 * @prop {Boolean} open        - 侧边栏是否展开
 * @prop {String}  currentMode - 当前功能模式 ID
 */
defineProps({
  open: Boolean,
  currentMode: String,
})

/**
 * Emits 定义
 * close                  - 请求关闭侧边栏
 * newChat                - 请求创建新对话
 * update:currentMode     - 更新功能模式（v-model:currentMode）
 */
defineEmits([
  'close', 'newChat',
  'update:currentMode',
])

</script>

<style>
/* 底部导航栏容器：使用 margin-top:auto 将其推到侧边栏底部 */
.sidebar-bottom {
  margin-top: auto;
  padding: 12px 8px 0;
  border-top: 1px solid var(--border);
}
/* 设置页链接样式 */
.settings-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
}
.settings-link:hover { background: var(--hover-bg); color: var(--text); }
/* 当前激活的路由链接高亮 */
.settings-link.router-link-active { background: var(--active-bg); color: var(--text); font-weight: 600; }
</style>

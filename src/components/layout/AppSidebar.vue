<!--
  ============================================================
  文件说明：AppSidebar.vue
  功能：应用左侧边栏组件，提供以下功能：
    1. 功能模式切换（聊天 / 文生图 / 语音转文字 / 文字转语音）
    2.（已移除）设置入口（已移动到主页右上角）

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
  </aside>
</template>

<script setup>
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
/* 侧边栏目前不含底部导航（设置入口已移至主页右上角） */
</style>

<!--
  ============================================================
  文件说明：AppSidebar.vue
  功能：应用左侧边栏组件，提供以下功能：
    1) 会话列表（ChatGPT 风格的历史对话）
    2) 功能模式切换（聊天 / 文生图 / 语音转文字 / 文字转语音）

  说明：
    - 设置入口已移动到主页右上角
    - 模型选择已移动到主页顶部
  ============================================================
-->
<template>
  <!-- sidebar：根据 open prop 动态添加 open 类控制展开/收起 -->
  <aside class="sidebar" :class="{ open: open }">
    <!-- 侧边栏顶部：品牌 logo + 新建对话按钮 -->
    <div class="sidebar-header">
      <span class="logo">✦ AI Chat</span>
      <!-- 新建对话按钮：创建一个新的会话（不会删除旧会话） -->
      <button class="icon-btn" @click="$emit('newChat')" :title="$t('common.newChat')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 会话列表：点击切换不同历史对话（仅影响聊天模式） -->
    <div class="sidebar-section">
      <p class="section-label">对话</p>
      <div class="session-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="session-row"
          :class="{ active: activeSessionId === s.id }"
        >
          <button
            class="session-item"
            @click="$emit('selectSession', s.id); $emit('close')"
            :title="s.title"
            type="button"
          >
            <span class="session-title">{{ s.title || '新对话' }}</span>
          </button>

          <button
            class="session-edit"
            type="button"
            title="重命名"
            @click.stop="$emit('renameSession', s.id)"
          >
            ✎
          </button>

          <button
            class="session-del"
            type="button"
            title="删除该对话"
            @click.stop="$emit('deleteSession', s.id)"
          >
            🗑
          </button>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup>

/**
 * Props 定义
 * @prop {Boolean} open             - 侧边栏是否展开
 * @prop {Array}   sessions         - 会话列表（仅聊天使用）
 * @prop {String}  activeSessionId  - 当前激活会话 id
 */
defineProps({
  open: Boolean,
  sessions: { type: Array, default: () => [] },
  activeSessionId: { type: String, default: '' },
})

/**
 * Emits 定义
 * close                 - 请求关闭侧边栏
 * newChat               - 新建会话
 * selectSession         - 选择会话（切换历史对话）
 */
defineEmits([
  'close',
  'newChat',
  'selectSession',
  'renameSession',
  'deleteSession',
])
</script>

<style>
/* AppSidebar 的核心布局样式在 src/styles/app.css 中维护 */
</style>

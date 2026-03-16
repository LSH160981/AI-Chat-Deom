<!--
  ============================================================
  文件说明：AppSidebar.vue
  功能：应用左侧边栏组件，提供以下功能：
    1. 功能模式切换（聊天 / 文生图 / 语音转文字 / 文字转语音）
    2. 当前会话模型选择（已检测模型显示下拉框，否则显示手动输入框）
    3. 聊天模式下的系统提示词编辑
    4. 底部跳转设置页面入口
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

    <!-- 当前会话：模型选择区域 -->
    <div class="sidebar-section">
      <p class="section-label">{{ $t('settings.defaultModel') }}</p>
      <!--
        已检测到模型列表时：渲染分组下拉选择框
        change 事件触发 update:selectedModel 通知父组件更新
      -->
      <select
        v-if="detectedModels.length"
        :value="selectedModel"
        @change="$emit('update:selectedModel', $event.target.value)"
        class="model-select"
      >
        <!-- 按 group 分组渲染 optgroup -->
        <optgroup v-for="[gName, group] in groupedEntries" :key="gName" :label="gName">
          <option v-for="m in group" :key="m.id" :value="m.id">{{ m.displayName }}</option>
        </optgroup>
      </select>
      <!--
        未检测到模型时：渲染手动输入框
        input 事件触发 update:selectedModel 通知父组件更新
      -->
      <input
        v-else
        :value="selectedModel"
        @input="$emit('update:selectedModel', $event.target.value)"
        class="system-prompt-input"
        placeholder="gpt-4o / claude-sonnet-4-5 …"
        style="font-family:monospace;font-size:12px;"
      />
    </div>

    <!-- 系统提示词编辑区域：仅在聊天模式下显示 -->
    <div v-if="currentMode === 'chat'" class="sidebar-section">
      <p class="section-label">{{ $t('settings.systemPrompt') }}</p>
      <!--
        textarea 双向绑定系统提示词
        input 事件触发 update:systemPrompt 通知父组件更新
      -->
      <textarea
        :value="systemPrompt"
        @input="$emit('update:systemPrompt', $event.target.value)"
        :placeholder="$t('settings.systemPromptPlaceholder')"
        class="system-prompt-input"
        rows="3"
      ></textarea>
    </div>

    <!-- 底部：跳转设置页面入口 -->
    <div class="sidebar-bottom">
      <!-- RouterLink：点击跳转 /settings 并关闭侧边栏 -->
      <RouterLink to="/settings" class="settings-link" @click="$emit('close')">
        <!-- 齿轮图标 -->
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        {{ $t('common.settings') }}
      </RouterLink>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CHAT_MODES } from '@/config/models'
import { settings } from '@/stores/settings'

/**
 * Props 定义
 * @prop {Boolean} open          - 侧边栏是否展开
 * @prop {String}  currentMode   - 当前功能模式 ID
 * @prop {String}  selectedModel - 当前选中的模型 ID
 * @prop {String}  systemPrompt  - 当前会话的系统提示词
 */
defineProps({
  open: Boolean,
  currentMode: String,
  selectedModel: String,
  systemPrompt: String,
})

/**
 * Emits 定义
 * close                  - 请求关闭侧边栏
 * newChat                - 请求创建新对话
 * update:currentMode     - 更新功能模式（v-model:currentMode）
 * update:selectedModel   - 更新选中模型（v-model:selectedModel）
 * update:systemPrompt    - 更新系统提示词（v-model:systemPrompt）
 */
defineEmits([
  'close', 'newChat',
  'update:currentMode',
  'update:selectedModel',
  'update:systemPrompt',
])

/**
 * computed：已检测到的模型列表
 * 从全局 settings.detectedModels 获取，fallback 为空数组
 */
const detectedModels = computed(() => settings.detectedModels || [])

/**
 * computed：按 group 字段将模型分组
 * 返回结构：{ [groupName]: ModelItem[] }
 * 用于渲染 <optgroup> 分组下拉
 */
const groupedModels = computed(() => {
  const map = {}
  for (const m of detectedModels.value) {
    if (!map[m.group]) map[m.group] = [] // 首次出现该分组时初始化数组
    map[m.group].push(m)
  }
  return map
})

/**
 * computed：将 groupedModels 转为 [groupName, models[]] 的数组形式
 * 方便 v-for 遍历渲染 optgroup
 */
const groupedEntries = computed(() => Object.entries(groupedModels.value))
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

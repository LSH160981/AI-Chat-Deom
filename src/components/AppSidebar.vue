<template>
  <aside class="sidebar" :class="{ open: open }">
    <div class="sidebar-header">
      <span class="logo">✦ AI Chat</span>
      <button class="icon-btn" @click="$emit('newChat')" :title="$t('common.newChat')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 功能切换 -->
    <div class="mode-list">
      <button
        v-for="m in CHAT_MODES"
        :key="m.id"
        class="mode-item"
        :class="{ active: currentMode === m.id }"
        @click="$emit('update:currentMode', m.id); $emit('close')"
      >
        <span class="mode-icon">{{ m.icon }}</span>
        <span>{{ $t('modes.' + m.id) }}</span>
      </button>
    </div>

    <div class="sidebar-divider"></div>

    <!-- 当前会话：仅保留快速调整项 -->
    <div class="sidebar-section">
      <p class="section-label">{{ $t('settings.defaultModel') }}</p>
      <select :value="selectedModel" @change="$emit('update:selectedModel', $event.target.value)" class="model-select">
        <optgroup v-for="group in MODEL_LIST" :key="group.label" :label="group.label">
          <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </optgroup>
      </select>
    </div>

    <div v-if="currentMode === 'chat'" class="sidebar-section">
      <p class="section-label">{{ $t('settings.systemPrompt') }}</p>
      <textarea
        :value="systemPrompt"
        @input="$emit('update:systemPrompt', $event.target.value)"
        :placeholder="$t('settings.systemPromptPlaceholder')"
        class="system-prompt-input"
        rows="3"
      ></textarea>
    </div>

    <!-- 底部：设置入口 -->
    <div class="sidebar-bottom">
      <RouterLink to="/settings" class="settings-link" @click="$emit('close')">
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
import { RouterLink } from 'vue-router'
import { MODEL_LIST } from '@/config/models'
import { CHAT_MODES } from '@/config/models'

defineProps({
  open: Boolean,
  currentMode: String,
  selectedModel: String,
  systemPrompt: String,
})

defineEmits([
  'close', 'newChat',
  'update:currentMode',
  'update:selectedModel',
  'update:systemPrompt',
])
</script>

<style>
.sidebar-bottom {
  margin-top: auto;
  padding: 12px 8px 0;
  border-top: 1px solid #eee;
}
.settings-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
}
.settings-link:hover { background: #efefef; color: #1a1a1a; }
.settings-link.router-link-active { background: #e8e8e8; color: #1a1a1a; font-weight: 600; }
</style>

<template>
  <aside class="sidebar" :class="{ open: open }">
    <div class="sidebar-header">
      <span class="logo">✦ AI Chat</span>
      <button class="icon-btn" @click="$emit('newChat')" title="新对话">
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
        <span>{{ m.label }}</span>
      </button>
    </div>

    <div class="sidebar-divider"></div>

    <!-- 模型选择 -->
    <div class="sidebar-section">
      <p class="section-label">模型</p>
      <select :value="selectedModel" @change="$emit('update:selectedModel', $event.target.value)" class="model-select">
        <optgroup v-for="group in MODEL_LIST" :key="group.label" :label="group.label">
          <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </optgroup>
      </select>
    </div>

    <!-- Chat 专属设置 -->
    <template v-if="currentMode === 'chat'">
      <div class="sidebar-section">
        <p class="section-label">系统提示词</p>
        <textarea
          :value="systemPrompt"
          @input="$emit('update:systemPrompt', $event.target.value)"
          placeholder="设置 AI 的角色和行为..."
          class="system-prompt-input"
          rows="4"
        ></textarea>
      </div>

      <div class="sidebar-section">
        <p class="section-label">温度 <span class="section-value">{{ temperature }}</span></p>
        <input
          type="range"
          :value="temperature"
          @input="$emit('update:temperature', +$event.target.value)"
          min="0" max="2" step="0.1"
          class="range-input"
        />
        <div class="range-labels"><span>精确</span><span>创意</span></div>
      </div>

      <div class="sidebar-section">
        <label class="toggle-label">
          <input type="checkbox" :checked="webSearchEnabled" @change="$emit('update:webSearchEnabled', $event.target.checked)" />
          <span>🌐 联网搜索</span>
        </label>
      </div>

      <div class="sidebar-section">
        <label class="toggle-label">
          <input type="checkbox" :checked="ttsEnabled" @change="$emit('update:ttsEnabled', $event.target.checked)" />
          <span>🔊 自动朗读回复</span>
        </label>
        <select v-if="ttsEnabled" :value="ttsVoice" @change="$emit('update:ttsVoice', $event.target.value)" class="model-select" style="margin-top:6px">
          <option v-for="v in TTS_VOICE_MAP.openai" :key="v.value" :value="v.value">{{ v.label }}</option>
        </select>
      </div>
    </template>

    <!-- 文生图设置 -->
    <div v-if="currentMode === 'txt2img'" class="sidebar-section">
      <p class="section-label">图片模型</p>
      <select :value="imageModel" @change="$emit('update:imageModel', $event.target.value)" class="model-select">
        <option v-for="m in IMAGE_MODEL_LIST" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <!-- 文字转语音设置 -->
    <template v-if="currentMode === 'txt2speech'">
      <div class="sidebar-section">
        <p class="section-label">TTS 服务商</p>
        <select :value="ttsProvider" @change="$emit('update:ttsProvider', $event.target.value)" class="model-select">
          <option value="openai">OpenAI</option>
          <option value="aws-polly">AWS Polly</option>
          <option value="elevenlabs">ElevenLabs</option>
        </select>
      </div>
      <div class="sidebar-section">
        <p class="section-label">声音</p>
        <select :value="ttsVoice" @change="$emit('update:ttsVoice', $event.target.value)" class="model-select">
          <option v-for="v in (TTS_VOICE_MAP[ttsProvider] || [])" :key="v.value" :value="v.value">{{ v.label }}</option>
        </select>
      </div>
    </template>

    <!-- 设置入口 -->
    <div class="sidebar-bottom">
      <RouterLink to="/settings" class="settings-link" @click="$emit('close')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        设置
      </RouterLink>
    </div>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { MODEL_LIST, IMAGE_MODEL_LIST, TTS_VOICE_MAP, CHAT_MODES } from '@/config/models'

defineProps({
  open: Boolean,
  currentMode: String,
  selectedModel: String,
  systemPrompt: String,
  temperature: Number,
  webSearchEnabled: Boolean,
  ttsEnabled: Boolean,
  ttsVoice: String,
  ttsProvider: String,
  imageModel: String,
})

defineEmits([
  'close', 'newChat',
  'update:currentMode', 'update:selectedModel',
  'update:systemPrompt', 'update:temperature',
  'update:webSearchEnabled', 'update:ttsEnabled',
  'update:ttsVoice', 'update:ttsProvider', 'update:imageModel',
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

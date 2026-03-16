<template>
  <div ref="messagesEl" class="messages-area">
    <!-- 空状态 -->
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">✦</div>
      <h2>$t('chat.empty')</h2>
      <p>{{ selectedModel }}</p>
    </div>

    <!-- 消息列表 -->
    <div v-else class="messages-list">
      <div v-for="(msg, i) in messages" :key="i" class="message-row" :class="msg.role">
        <div v-if="msg.role === 'assistant'" class="avatar ai-avatar">✦</div>
        <div class="message-content" :class="msg.role">
          <img v-if="msg.role === 'user' && msg.image" :src="msg.image" class="msg-image" />
          <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderContent(msg.content)"></div>
          <div v-else class="user-text">{{ msg.content }}</div>
          <button
            v-if="msg.role === 'assistant' && msg.content"
            class="msg-tts-btn"
            @click="$emit('speak', msg.content, i)"
            :title="speakingIdx === i ? $t('chat.stopSpeak') : $t('chat.speak')"
          >{{ speakingIdx === i ? '⏹' : '🔊' }}</button>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="isLoading" class="message-row assistant">
        <div class="avatar ai-avatar">✦</div>
        <div class="message-content assistant">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览 -->
  <div v-if="attachedImage" class="attached-preview">
    <img :src="attachedImage" />
    <button @click="$emit('removeImage')" class="remove-attach">✕</button>
  </div>

  <!-- 输入区 -->
  <div class="input-area">
    <div class="input-wrapper" :class="{ focused: isFocused }">
      <label class="attach-btn" :title="$t('chat.uploadImage')">
        <input type="file" accept="image/*" @change="$emit('imageUpload', $event)" style="display:none" />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </label>
      <button class="attach-btn" :class="{ recording: isRecording }" @click="$emit('toggleRecording')" :title="$t('chat.voiceInput')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <textarea
        ref="inputEl"
        v-model="inputValue"
        @keydown.enter.exact.prevent="$emit('send')"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @input="autoResize"
        placeholder="$t('chat.placeholder')"
        rows="1"
        :disabled="isLoading"
        class="input-textarea"
      ></textarea>
      <button @click="$emit('send')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L8 15M8 1L3 6M8 1L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <p class="disclaimer">$t('chat.disclaimer')</p>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'

const props = defineProps({
  messages: Array,
  isLoading: Boolean,
  isRecording: Boolean,
  attachedImage: String,
  selectedModel: String,
  speakingIdx: Number,
  modelValue: String,
})

const emit = defineEmits(['update:modelValue', 'send', 'speak', 'toggleRecording', 'imageUpload', 'removeImage'])

const { renderContent } = useMarkdown()
const messagesEl = ref(null)
const inputEl = ref(null)
const isFocused = ref(false)

const inputValue = ref(props.modelValue || '')
watch(() => props.modelValue, (v) => { inputValue.value = v })
watch(inputValue, (v) => emit('update:modelValue', v))

const autoResize = (e) => {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
}

// 滚动到底部（供父组件调用）
const scrollToBottom = () => nextTick(() => {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
})
const focusInput = () => nextTick(() => inputEl.value?.focus())
const resetInputHeight = () => { if (inputEl.value) inputEl.value.style.height = 'auto' }

defineExpose({ scrollToBottom, focusInput, resetInputHeight })
</script>

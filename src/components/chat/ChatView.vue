<!--
  ============================================================
  文件说明：ChatView.vue
  功能：聊天对话视图组件，负责渲染消息列表和输入区域。
  包含：
    - 空状态提示（无消息时显示欢迎界面）
    - 消息列表（用户消息 / AI 消息，支持 Markdown 渲染和图片显示）
    - AI 消息 TTS 朗读按钮
    - 正在加载时的打字动画占位
    - 图片附件预览（发送前预览已附加图片）
    - 底部输入区：图片上传、语音录入、文本输入、发送按钮
  对外暴露方法（defineExpose）：
    - scrollToBottom()  滚动到消息列表底部
    - focusInput()      聚焦输入框
    - resetInputHeight()重置输入框高度
  ============================================================
-->
<template>
  <!-- 消息滚动容器，ref 用于父组件或内部方法控制滚动 -->
  <div ref="messagesEl" class="messages-area">
    <!-- 空状态：消息列表为空时显示欢迎提示 -->
    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">✦</div>
      <h2>{{ $t('chat.empty') }}</h2>
      <!-- 显示当前选中的模型名 -->
      <p>{{ selectedModel }}</p>
    </div>

    <!-- 消息列表：遍历 messages 渲染每条消息 -->
    <div v-else class="messages-list">
      <div v-for="(msg, i) in messages" :key="i" class="message-row" :class="msg.role">
        <!-- AI 消息头像（仅 assistant 角色显示） -->
        <div v-if="msg.role === 'assistant'" class="avatar ai-avatar">✦</div>
        <!-- 消息内容区域，根据角色绑定不同样式类 -->
        <div class="message-content" :class="msg.role">
          <!-- 用户消息附带的图片（base64 DataURL） -->
          <img v-if="msg.role === 'user' && msg.image" :src="msg.image" class="msg-image" />
          <!--
            AI 消息：使用 v-html 渲染经过 Markdown 解析的 HTML
            renderContent 会处理代码高亮、数学公式等
          -->
          <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderContent(msg.content)"></div>
          <!-- 用户消息：纯文本显示 -->
          <div v-else class="user-text">{{ msg.content }}</div>
          <!--
            TTS 朗读按钮：仅在 AI 消息有内容时显示
            点击切换朗读/停止状态，通过 speakingIdx 判断当前是否正在朗读该条消息
          -->
          <button
            v-if="msg.role === 'assistant' && msg.content"
            class="msg-tts-btn"
            @click="$emit('speak', msg.content, i)"
            :title="speakingIdx === i ? $t('chat.stopSpeak') : $t('chat.speak')"
          >{{ speakingIdx === i ? '⏹' : '🔊' }}</button>
        </div>
      </div>

      <!-- 加载中占位：isLoading 为 true 时显示打字动画 -->
      <div v-if="isLoading" class="message-row assistant">
        <div class="avatar ai-avatar">✦</div>
        <div class="message-content assistant">
          <!-- 三点打字动画，CSS 实现循环跳动效果 -->
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片附件预览区：用户已选择图片但尚未发送时显示 -->
  <div v-if="attachedImage" class="attached-preview">
    <img :src="attachedImage" />
    <!-- 移除按钮：通知父组件清空附件 -->
    <button @click="$emit('removeImage')" class="remove-attach">✕</button>
  </div>

  <!-- 底部输入区域 -->
  <div class="input-area">
    <!-- 输入框包装器：isFocused 状态下添加聚焦样式 -->
    <div class="input-wrapper" :class="{ focused: isFocused }">
      <!-- 图片上传按钮：点击触发隐藏的 file input -->
      <label class="attach-btn" :title="$t('chat.uploadImage')">
        <!-- 隐藏的文件选择输入，限制只接受图片类型 -->
        <input type="file" accept="image/*" @change="$emit('imageUpload', $event)" style="display:none" />
        <!-- 图片图标 SVG -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </label>
      <!-- 语音录入按钮：isRecording 为 true 时显示录音中样式 -->
      <button class="attach-btn" :class="{ recording: isRecording }" @click="$emit('toggleRecording')" :title="$t('chat.voiceInput')">
        <!-- 麦克风图标 SVG -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <!--
        文本输入框
        - v-model="inputValue" 与内部 ref 双向绑定，同时通过 watch 同步父组件
        - Enter 键发送（阻止默认换行）
        - @input="autoResize" 实现自动高度调整
        - rows="1" 初始单行，最高 160px
      -->
      <textarea
        ref="inputEl"
        v-model="inputValue"
        @keydown.enter.exact.prevent="$emit('send')"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @input="autoResize"
        :placeholder="$t('chat.placeholder')"
        rows="1"
        :disabled="isLoading"
        class="input-textarea"
      ></textarea>
      <!-- 发送按钮：输入框为空或加载中时禁用 -->
      <button @click="$emit('send')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
        <!-- 向上箭头图标 SVG -->
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L8 15M8 1L3 6M8 1L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'

/**
 * Props 定义
 * @prop {Array}   messages      - 聊天消息列表，每条格式：{ role, content, image? }
 * @prop {Boolean} isLoading     - 是否正在等待 AI 响应
 * @prop {Boolean} isRecording   - 是否正在录音
 * @prop {String}  attachedImage - 已附加的图片 base64 DataURL（可选）
 * @prop {Number}  speakingIdx   - 当前朗读中的消息索引（-1 表示未在朗读）
 * @prop {String}  modelValue    - 输入框内容（v-model 绑定）
 */
const props = defineProps({
  messages: Array,
  isLoading: Boolean,
  isRecording: Boolean,
  attachedImage: String,
  speakingIdx: Number,
  modelValue: String,
})

/**
 * Emits 定义
 * update:modelValue - 输入框内容变化时同步父组件（v-model）
 * send              - 请求发送消息
 * speak             - 请求朗读指定消息，参数：(text, index)
 * toggleRecording   - 切换语音录音状态
 * imageUpload       - 图片上传文件选择事件，参数：原生 Event
 * removeImage       - 请求移除已附加的图片
 */
const emit = defineEmits(['update:modelValue', 'send', 'speak', 'toggleRecording', 'imageUpload', 'removeImage'])

// Markdown 渲染 composable，处理代码高亮、数学公式等
const { renderContent } = useMarkdown()

/** 消息滚动容器的 DOM 引用 */
const messagesEl = ref(null)

/** 文本输入框的 DOM 引用 */
const inputEl = ref(null)

/** 输入框是否处于聚焦状态（控制外边框高亮样式） */
const isFocused = ref(false)

/** 输入框内容（内部维护，通过 watch 与父组件双向同步） */
const inputValue = ref(props.modelValue || '')

// 监听父组件传入的 modelValue 变化，同步到内部 inputValue
watch(() => props.modelValue, (v) => { inputValue.value = v })

// 监听内部 inputValue 变化，通过 emit 通知父组件更新
watch(inputValue, (v) => emit('update:modelValue', v))

/**
 * 自动调整输入框高度
 * 根据内容滚动高度动态设置高度，最大限制为 160px，超出后出现滚动条
 * @param {Event} e - textarea 的 input 事件
 */
const autoResize = (e) => {
  e.target.style.height = 'auto'                                        // 先重置高度
  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'  // 设置为实际内容高度（最大160px）
}

/**
 * 滚动消息列表到底部
 * 使用 nextTick 确保 DOM 更新后再执行滚动（父组件可通过 ref 调用）
 */
const scrollToBottom = () => nextTick(() => {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
})

/**
 * 聚焦输入框
 * 使用 nextTick 确保 DOM 更新后再执行（父组件可通过 ref 调用）
 */
const focusInput = () => nextTick(() => inputEl.value?.focus())

/**
 * 重置输入框高度为自动（发送消息后调用，恢复单行初始状态）
 */
const resetInputHeight = () => { if (inputEl.value) inputEl.value.style.height = 'auto' }

// 将以上三个方法暴露给父组件，允许通过 ref.value.xxx() 调用
defineExpose({ scrollToBottom, focusInput, resetInputHeight })
</script>

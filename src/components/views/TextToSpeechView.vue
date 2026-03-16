<!--
  ============================================================
  文件说明：TextToSpeechView.vue
  功能：文字转语音（Text-to-Speech）独立视图组件。
  包含：
    - 空状态提示（未输入文本/未生成音频时显示引导文案）
    - 加载中动画（TTS API 请求期间显示旋转器）
    - 音频播放器（生成完成后自动播放音频）
    - 底部文本输入区域（支持多行，含生成按钮）
  该组件通过 v-model 与父组件同步输入内容，
  通过 @synthesize 事件通知父组件执行语音合成。
  ============================================================
-->
<template>
  <div class="gen-area">
    <!-- 空状态：无音频 URL 且不在加载中时显示引导提示 -->
    <div v-if="!audioUrl && !isLoading" class="empty-state">
      <div class="empty-icon">🔊</div>
      <h2>{{ $t('tts.empty') }}</h2>
      <!-- 操作引导提示文案 -->
      <p>{{ $t('tts.emptyHint') }}</p>
    </div>

    <!-- 加载中：TTS 合成 API 请求期间显示旋转动画 -->
    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>{{ $t('tts.synthesizing') }}</p>
    </div>

    <!--
      音频播放器：有 audioUrl 时显示
      - controls 显示原生播放控件（播放/暂停/进度/音量）
      - autoplay 合成完成后自动播放
    -->
    <div v-if="audioUrl" class="audio-player">
      <audio controls :src="audioUrl" autoplay></audio>
    </div>

    <!-- 底部文本输入区域 -->
    <div class="input-area">
      <!-- 输入框容器：聚焦时添加 focused 高亮样式 -->
      <div class="input-wrapper" :class="{ focused: isFocused }">
        <!--
          文本输入框
          - v-model="inputValue" 与内部 ref 双向绑定，通过 watch 同步父组件
          - rows="3" 默认三行，适合较长文本输入
          - 合成中时禁用输入
        -->
        <textarea
          v-model="inputValue"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :placeholder="$t('tts.placeholder')"
          rows="3"
          :disabled="isLoading"
          class="input-textarea"
        ></textarea>
        <!-- 合成按钮：输入框为空或加载中时禁用 -->
        <button @click="$emit('synthesize')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
          <!-- 播放/生成图标（三角形） -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

/**
 * Props 定义
 * @prop {String}  audioUrl   - TTS 合成后的音频 URL（blob URL 或远程 URL），null 表示未生成
 * @prop {Boolean} isLoading  - 是否正在合成（API 请求中）
 * @prop {String}  modelValue - 文本输入框内容（v-model 绑定）
 */
const props = defineProps({
  audioUrl: String,
  isLoading: Boolean,
  modelValue: String,
})

/**
 * Emits 定义
 * update:modelValue - 输入框内容变化时同步父组件（v-model）
 * synthesize        - 请求执行文字转语音合成
 */
const emit = defineEmits(['update:modelValue', 'synthesize'])

/** 输入框聚焦状态，控制外边框高亮样式 */
const isFocused = ref(false)

/** 文本输入框内容（内部维护，与父组件双向同步） */
const inputValue = ref(props.modelValue || '')

// 监听父组件 modelValue 变化，同步到内部 inputValue
watch(() => props.modelValue, (v) => { inputValue.value = v })

// 监听内部 inputValue 变化，emit 通知父组件更新
watch(inputValue, (v) => emit('update:modelValue', v))
</script>

<!--
  ============================================================
  文件说明：SpeechToTextView.vue
  功能：语音转文字（Speech-to-Text）独立视图组件。
  包含：
    - 空状态提示（未录音/未上传时显示引导文案）
    - 加载中动画（转写 API 请求期间显示旋转器）
    - 转写结果展示区域（带清空按钮）
    - 操作区：录音按钮（实时录音）+ 音频文件上传（上传后转写）
  该组件为纯展示/操作层，核心逻辑（录音、API 调用）由父组件 AIChat 处理。
  通过 defineEmits 向父组件发送操作事件。
  ============================================================
-->
<template>
  <div class="gen-area">
    <!-- 空状态：无转写结果且不在加载中时显示引导提示 -->
    <div v-if="!transcription && !isLoading" class="empty-state">
      <div class="empty-icon">🎙️</div>
      <h2>{{ $t('stt.empty') }}</h2>
      <!-- 操作引导提示文案 -->
      <p>{{ $t('stt.emptyHint') }}</p>
    </div>

    <!-- 加载中：转写 API 请求期间显示旋转动画 -->
    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>{{ $t('stt.transcribing') }}</p>
    </div>

    <!-- 转写结果区域：有转写内容时显示 -->
    <div v-if="transcription" class="transcription-result">
      <!-- 展示转写后的文本内容 -->
      <p>{{ transcription }}</p>
      <!-- 清空按钮：emit clear 事件通知父组件清空 transcription -->
      <button @click="$emit('clear')" class="clear-result">清空</button>
    </div>

    <!-- 操作区：录音按钮 + 分隔线 + 上传按钮 -->
    <div class="input-area speech-actions">
      <!--
        录音切换按钮：
        - isRecording=true 时显示"停止录音"文案并添加 recording 样式（红色）
        - 点击触发 toggleRecording 事件，由父组件处理录音逻辑
      -->
      <button
        class="record-big-btn"
        :class="{ recording: isRecording }"
        @click="$emit('toggleRecording')"
      >
        {{ isRecording ? $t('stt.stopRecord') : $t('stt.startRecord') }}
      </button>
      <!-- 分隔文字"或" -->
      <div class="or-divider">或</div>
      <!--
        音频文件上传按钮：
        - 点击触发隐藏的 file input
        - 文件选择后触发 upload 事件，传递原生 change Event 给父组件处理
      -->
      <label class="upload-audio-btn">
        <!-- 隐藏的文件输入框，仅接受音频类型文件 -->
        <input type="file" accept="audio/*" @change="$emit('upload', $event)" style="display:none" />
        {{ $t('stt.uploadAudio') }}
      </label>
    </div>
  </div>
</template>

<script setup>
/**
 * Props 定义
 * @prop {String}  transcription - 语音转写的文本结果（空字符串表示无结果）
 * @prop {Boolean} isLoading     - 是否正在转写（API 请求中）
 * @prop {Boolean} isRecording   - 是否正在录音
 */
defineProps({
  transcription: String,
  isLoading: Boolean,
  isRecording: Boolean,
})

/**
 * Emits 定义
 * toggleRecording - 切换录音开始/停止状态
 * upload          - 用户选择音频文件后触发，参数：原生 change Event
 * clear           - 清空转写结果
 */
defineEmits(['toggleRecording', 'upload', 'clear'])
</script>

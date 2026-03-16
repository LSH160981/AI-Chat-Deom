<template>
  <div class="gen-area">
    <div v-if="!transcription && !isLoading" class="empty-state">
      <div class="empty-icon">🎙️</div>
      <h2>语音转文字</h2>
      <p>录音或上传音频文件</p>
    </div>

    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>正在转录...</p>
    </div>

    <div v-if="transcription" class="transcription-result">
      <p>{{ transcription }}</p>
      <button @click="$emit('clear')" class="clear-result">清空</button>
    </div>

    <div class="input-area speech-actions">
      <button
        class="record-big-btn"
        :class="{ recording: isRecording }"
        @click="$emit('toggleRecording')"
      >
        {{ isRecording ? '⏹ 停止录音' : '🎙 开始录音' }}
      </button>
      <div class="or-divider">或</div>
      <label class="upload-audio-btn">
        <input type="file" accept="audio/*" @change="$emit('upload', $event)" style="display:none" />
        📁 上传音频文件
      </label>
    </div>
  </div>
</template>

<script setup>
defineProps({
  transcription: String,
  isLoading: Boolean,
  isRecording: Boolean,
})
defineEmits(['toggleRecording', 'upload', 'clear'])
</script>

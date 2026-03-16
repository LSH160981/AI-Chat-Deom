<template>
  <div class="gen-area">
    <div v-if="!transcription && !isLoading" class="empty-state">
      <div class="empty-icon">🎙️</div>
      <h2>$t('stt.empty')</h2>
      <p>$t('stt.emptyHint')</p>
    </div>

    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>$t('stt.transcribing')</p>
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
        {{ isRecording ? $t('stt.stopRecord') : $t('stt.startRecord') }}
      </button>
      <div class="or-divider">或</div>
      <label class="upload-audio-btn">
        <input type="file" accept="audio/*" @change="$emit('upload', $event)" style="display:none" />
        $t('stt.uploadAudio')
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

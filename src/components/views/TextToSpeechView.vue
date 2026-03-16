<template>
  <div class="gen-area">
    <div v-if="!audioUrl && !isLoading" class="empty-state">
      <div class="empty-icon">🔊</div>
      <h2>{{ $t('tts.empty') }}</h2>
      <p>{{ $t('tts.emptyHint') }}</p>
    </div>

    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>{{ $t('tts.synthesizing') }}</p>
    </div>

    <div v-if="audioUrl" class="audio-player">
      <audio controls :src="audioUrl" autoplay></audio>
    </div>

    <div class="input-area">
      <div class="input-wrapper" :class="{ focused: isFocused }">
        <textarea
          v-model="inputValue"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :placeholder="$t('tts.placeholder')"
          rows="3"
          :disabled="isLoading"
          class="input-textarea"
        ></textarea>
        <button @click="$emit('synthesize')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
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

const props = defineProps({
  audioUrl: String,
  isLoading: Boolean,
  modelValue: String,
})

const emit = defineEmits(['update:modelValue', 'synthesize'])

const isFocused = ref(false)
const inputValue = ref(props.modelValue || '')
watch(() => props.modelValue, (v) => { inputValue.value = v })
watch(inputValue, (v) => emit('update:modelValue', v))
</script>

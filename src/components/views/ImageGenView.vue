<template>
  <div class="gen-area">
    <div v-if="generatedImages.length === 0 && !isLoading" class="empty-state">
      <div class="empty-icon">🎨</div>
      <h2>AI 图片生成</h2>
      <p>描述你想要的图片</p>
    </div>

    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>正在生成图片...</p>
    </div>

    <div v-if="generatedImages.length > 0" class="image-grid">
      <div v-for="(img, i) in generatedImages" :key="i" class="image-item">
        <img :src="img" @click="$emit('preview', img)" />
        <a :href="img" download="ai-image.png" class="download-btn">↓ 下载</a>
      </div>
    </div>

    <div class="input-area">
      <div class="input-wrapper" :class="{ focused: isFocused }">
        <textarea
          v-model="inputValue"
          @keydown.enter.exact.prevent="$emit('generate')"
          @focus="isFocused = true"
          @blur="isFocused = false"
          placeholder="描述你想要的图片，例如：一只在咖啡馆读书的猫..."
          rows="2"
          :disabled="isLoading"
          class="input-textarea"
        ></textarea>
        <button @click="$emit('generate')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
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
  generatedImages: Array,
  isLoading: Boolean,
  modelValue: String,
})

const emit = defineEmits(['update:modelValue', 'generate', 'preview'])

const isFocused = ref(false)
const inputValue = ref(props.modelValue || '')
watch(() => props.modelValue, (v) => { inputValue.value = v })
watch(inputValue, (v) => emit('update:modelValue', v))
</script>

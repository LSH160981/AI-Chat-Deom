<!--
  ============================================================
  文件说明：ImageGenView.vue
  功能：文字生成图片（Text-to-Image）视图组件。
  包含：
    - 空状态提示（尚未生成图片时显示引导文案）
    - 加载中动画（图片生成期间显示旋转器）
    - 图片结果网格（展示生成的图片，支持点击预览大图和下载）
    - 底部提示词输入区域（textarea + 生成按钮）
  父组件通过 v-model 同步输入内容，通过 @generate 监听生成请求，
  通过 @preview 监听大图预览请求。
  ============================================================
-->
<template>
  <div class="gen-area">
    <!-- 空状态：无已生成图片且不在加载中时显示 -->
    <div v-if="generatedImages.length === 0 && !isLoading" class="empty-state">
      <div class="empty-icon">🎨</div>
      <h2>{{ $t('image.empty') }}</h2>
      <!-- 引导提示文案 -->
      <p>{{ $t('image.emptyHint') }}</p>
    </div>

    <!-- 加载中：图片生成 API 请求期间显示旋转动画 -->
    <div v-if="isLoading" class="gen-loading">
      <div class="gen-spinner"></div>
      <p>{{ $t('image.generating') }}</p>
    </div>

    <!-- 图片结果网格：generatedImages 有数据时显示 -->
    <div v-if="generatedImages.length > 0" class="image-grid">
      <div v-for="(img, i) in generatedImages" :key="i" class="image-item">
        <!-- 点击图片触发 preview 事件，传入图片 URL，父组件负责打开灯箱 -->
        <img :src="img" @click="$emit('preview', img)" />
        <!-- 下载链接：使用 download 属性触发浏览器下载 -->
        <a :href="img" download="ai-image.png" class="download-btn">{{ $t('image.download') }}</a>
      </div>
    </div>

    <!-- 底部提示词输入区域 -->
    <div class="input-area">
      <!-- 输入框容器：聚焦时添加 focused 样式 -->
      <div class="input-wrapper" :class="{ focused: isFocused }">
        <!--
          提示词输入框
          - v-model="inputValue" 与内部 ref 双向绑定
          - Enter 键触发生成（阻止默认换行）
          - 生成中时禁用输入
        -->
        <textarea
          v-model="inputValue"
          @keydown.enter.exact.prevent="$emit('generate')"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :placeholder="$t('image.placeholder')"
          rows="2"
          :disabled="isLoading"
          class="input-textarea"
        ></textarea>
        <!-- 生成按钮：输入框为空或加载中时禁用 -->
        <button @click="$emit('generate')" :disabled="!inputValue.trim() || isLoading" class="send-btn">
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
 * @prop {Array}   generatedImages - 已生成的图片 URL 列表
 * @prop {Boolean} isLoading       - 是否正在生成图片
 * @prop {String}  modelValue      - 提示词输入框内容（v-model 绑定）
 */
const props = defineProps({
  generatedImages: Array,
  isLoading: Boolean,
  modelValue: String,
})

/**
 * Emits 定义
 * update:modelValue - 输入框内容变化时同步父组件（v-model）
 * generate          - 请求生成图片
 * preview           - 请求预览大图，参数：图片 URL
 */
const emit = defineEmits(['update:modelValue', 'generate', 'preview'])

/** 输入框聚焦状态，控制外边框高亮样式 */
const isFocused = ref(false)

/** 提示词输入框内容（内部维护，与父组件双向同步） */
const inputValue = ref(props.modelValue || '')

// 监听父组件 modelValue 变化，同步到内部 inputValue
watch(() => props.modelValue, (v) => { inputValue.value = v })

// 监听内部 inputValue 变化，emit 通知父组件
watch(inputValue, (v) => emit('update:modelValue', v))
</script>

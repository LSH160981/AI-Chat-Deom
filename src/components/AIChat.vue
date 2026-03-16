<template>
  <div class="chat-app">
    <AppSidebar
      :open="sidebarOpen"
      v-model:currentMode="currentMode"
      v-model:selectedModel="selectedModel"
      v-model:systemPrompt="sessionSystemPrompt"
      @close="sidebarOpen = false"
      @newChat="newChat"
    />

    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <header class="topbar">
        <button class="icon-btn topbar-menu-btn" @click="sidebarOpen = !sidebarOpen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span class="topbar-title">{{ currentModeLabel }}</span>
        <button v-if="currentMode === 'chat' && messages.length > 0" class="icon-btn" @click="newChat" :title="$t('common.clear')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </header>

      <!-- 未配置 API 时的引导提示 -->
      <div v-if="!settings.apiBaseUrl" class="no-api-banner">
        <div class="no-api-inner">
          <span>⚙️</span>
          <span>请先在<router-link to="/settings">设置</router-link>中填写 API 地址和密钥</span>
        </div>
      </div>

      <ChatView
        v-if="currentMode === 'chat'"
        ref="chatViewRef"
        :messages="messages"
        :isLoading="isLoading"
        :isRecording="isRecording"
        :attachedImage="attachedImage"
        :selectedModel="selectedModel"
        :speakingIdx="speakingIdx"
        v-model="userInput"
        @send="sendMessage"
        @speak="speakText"
        @toggleRecording="toggleRecording"
        @imageUpload="handleImageUpload"
        @removeImage="attachedImage = null"
      />

      <ImageGenView
        v-else-if="currentMode === 'txt2img'"
        :generatedImages="generatedImages"
        :isLoading="isLoading"
        v-model="userInput"
        @generate="generateImage"
        @preview="lightboxSrc = $event"
      />

      <SpeechToTextView
        v-else-if="currentMode === 'speech2txt'"
        :transcription="transcription"
        :isLoading="isLoading"
        :isRecording="isRecording"
        @toggleRecording="toggleSTTRecording"
        @upload="handleAudioUpload"
        @clear="transcription = ''"
      />

      <TextToSpeechView
        v-else-if="currentMode === 'txt2speech'"
        :audioUrl="audioUrl"
        :isLoading="isLoading"
        v-model="userInput"
        @synthesize="doSynthesize"
      />
    </main>

    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppSidebar from './AppSidebar.vue'
import ChatView from './views/ChatView.vue'
import ImageGenView from './views/ImageGenView.vue'
import SpeechToTextView from './views/SpeechToTextView.vue'
import TextToSpeechView from './views/TextToSpeechView.vue'
import { useRecorder } from '@/composables/useRecorder'
import { useModal } from '@/composables/useModal'
import { chatStream, generateImage as apiGenerateImage, transcribeAudio, synthesizeSpeech } from '@/composables/useApiClient'
import { CHAT_MODES } from '@/config/models'
import { settings } from '@/stores/settings'

const { t } = useI18n()
const { alert } = useModal()

// ===== 会话状态 =====
const currentMode = ref('chat')
const sidebarOpen = ref(false)
const selectedModel = ref(settings.defaultModel || '')
const sessionSystemPrompt = ref(settings.systemPrompt)

const messages = ref([])
const userInput = ref('')
const isLoading = ref(false)
const attachedImage = ref(null)
const generatedImages = ref([])
const transcription = ref('')
const audioUrl = ref(null)
const speakingIdx = ref(-1)
const lightboxSrc = ref(null)
const chatViewRef = ref(null)
let currentAudio = null
let abortController = null

const { isRecording, startRecording, stopRecording } = useRecorder()

const currentModeLabel = computed(() => CHAT_MODES.find(m => m.id === currentMode.value)?.label || '')

const newChat = () => {
  messages.value = []
  userInput.value = ''
  attachedImage.value = null
  abortController?.abort()
}

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { attachedImage.value = ev.target.result }
  reader.readAsDataURL(file)
}

// ===== Chat =====
const sendMessage = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return

  const model = selectedModel.value || settings.defaultModel
  if (!model) {
    await alert({ icon: '⚙️', title: '未选择模型', message: '请先在设置页检测模型，或手动输入模型 ID', showCancel: false })
    return
  }
  if (!settings.apiBaseUrl) {
    await alert({ icon: '⚙️', title: '未配置 API', message: '请先在设置页填写 API 地址和密钥', showCancel: false })
    return
  }

  const img = attachedImage.value
  userInput.value = ''
  attachedImage.value = null
  chatViewRef.value?.resetInputHeight()

  const userMsg = { role: 'user', content: text, image: img }
  messages.value.push(userMsg)
  isLoading.value = true
  chatViewRef.value?.scrollToBottom()

  // 构建历史
  const history = []
  const sysPrompt = sessionSystemPrompt.value || settings.systemPrompt
  if (sysPrompt) history.push({ role: 'system', content: sysPrompt })

  const ctxMsgs = messages.value.slice(0, -1).slice(-settings.contextLength)
  for (const m of ctxMsgs) history.push({ role: m.role, content: m.content })
  history.push({ role: 'user', content: text })

  messages.value.push({ role: 'assistant', content: '' })
  abortController = new AbortController()

  try {
    await chatStream({
      messages: history,
      model,
      temperature: settings.temperature,
      signal: abortController.signal,
      onChunk: (chunk) => {
        messages.value[messages.value.length - 1].content += chunk
        chatViewRef.value?.scrollToBottom()
      },
    })

    // 自动 TTS
    if (settings.ttsEnabled) {
      const full = messages.value[messages.value.length - 1].content
      try {
        const url = await synthesizeSpeech({ text: full.slice(0, 500), voice: settings.ttsVoice, model: settings.ttsModel || 'tts-1' })
        const audio = new Audio(url)
        audio.play()
      } catch { /* TTS 失败不影响主流程 */ }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      messages.value[messages.value.length - 1].content = `❌ ${e.message}`
    }
  } finally {
    isLoading.value = false
    chatViewRef.value?.scrollToBottom()
    chatViewRef.value?.focusInput()
  }
}

const speakText = async (text, idx) => {
  if (speakingIdx.value === idx) {
    currentAudio?.pause()
    currentAudio = null
    speakingIdx.value = -1
    return
  }
  speakingIdx.value = idx
  try {
    const url = await synthesizeSpeech({ text: text.slice(0, 500), voice: settings.ttsVoice, model: settings.ttsModel || 'tts-1' })
    currentAudio = new Audio(url)
    currentAudio.play()
    currentAudio.onended = () => { speakingIdx.value = -1; currentAudio = null }
  } catch { speakingIdx.value = -1 }
}

// ===== 语音输入 =====
const toggleRecording = async () => {
  if (isRecording.value) { stopRecording(); return }
  try {
    await startRecording(async (blob) => {
      try {
        const text = await transcribeAudio(blob)
        userInput.value += (userInput.value ? ' ' : '') + text
      } catch (e) { console.error(e) }
    })
  } catch {
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

// ===== 文生图 =====
const generateImage = async () => {
  const prompt = userInput.value.trim()
  if (!prompt || isLoading.value) return
  userInput.value = ''
  isLoading.value = true
  generatedImages.value = []
  try {
    const url = await apiGenerateImage({
      prompt,
      model: settings.imageModel || 'dall-e-3',
      size: settings.imageSize || '1024x1024',
      quality: settings.imageQuality || 'standard',
    })
    generatedImages.value = [url]
  } catch (e) {
    await alert({ icon: '⚠️', title: `生成失败：${e.message}`, showCancel: false })
  } finally {
    isLoading.value = false
  }
}

// ===== STT 独立页 =====
const toggleSTTRecording = async () => {
  if (isRecording.value) { stopRecording(); return }
  try {
    await startRecording(async (blob) => {
      isLoading.value = true
      try {
        transcription.value = await transcribeAudio(blob)
      } catch (e) {
        await alert({ icon: '⚠️', title: `转写失败：${e.message}`, showCancel: false })
      } finally { isLoading.value = false }
    })
  } catch {
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

const handleAudioUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  isLoading.value = true
  transcription.value = ''
  try {
    transcription.value = await transcribeAudio(file)
  } catch (err) {
    await alert({ icon: '⚠️', title: `转写失败：${err.message}`, showCancel: false })
  } finally { isLoading.value = false }
}

// ===== TTS 独立页 =====
const doSynthesize = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return
  isLoading.value = true
  audioUrl.value = null
  try {
    audioUrl.value = await synthesizeSpeech({ text, voice: settings.ttsVoice, model: settings.ttsModel || 'tts-1' })
  } catch (e) {
    await alert({ icon: '⚠️', title: `合成失败：${e.message}`, showCancel: false })
  } finally { isLoading.value = false }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';
@import '@/styles/app.css';

.no-api-banner { background: rgba(96,165,250,0.1); border-bottom: 1px solid rgba(96,165,250,0.3); padding: 8px 20px; }
.no-api-inner { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); max-width: 760px; margin: 0 auto; }
.no-api-inner a { color: #60a5fa; text-decoration: none; font-weight: 500; }
.no-api-inner a:hover { text-decoration: underline; }
</style>

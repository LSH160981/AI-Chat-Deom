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
        <button class="icon-btn" @click="sidebarOpen = !sidebarOpen">
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
        @synthesize="synthesizeSpeech"
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
import { usePuter } from '@/composables/usePuter'
import { useRecorder } from '@/composables/useRecorder'
import { useModal } from '@/composables/useModal'
import { CHAT_MODES } from '@/config/models'
import { settings } from '@/stores/settings'

const { t } = useI18n()
const { puter: getPuter } = usePuter()
const { alert } = useModal()

// ===== 当前会话状态（不持久化）=====
const currentMode = ref('chat')
const sidebarOpen = ref(false)
const selectedModel = ref(settings.defaultModel)   // 初始值来自设置
const sessionSystemPrompt = ref(settings.systemPrompt) // 会话级可覆盖

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

const { isRecording, startRecording, stopRecording } = useRecorder()

const currentModeLabel = computed(() => CHAT_MODES.find(m => m.id === currentMode.value)?.label || '')

const newChat = () => {
  messages.value = []
  userInput.value = ''
  attachedImage.value = null
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
  const puter = getPuter()
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const text = userInput.value.trim()
  const img = attachedImage.value
  userInput.value = ''
  attachedImage.value = null
  chatViewRef.value?.resetInputHeight()

  messages.value.push({ role: 'user', content: text, image: img })
  isLoading.value = true
  chatViewRef.value?.scrollToBottom()

  try {
    const history = []
    const sysPrompt = sessionSystemPrompt.value || settings.systemPrompt
    if (sysPrompt) history.push({ role: 'system', content: sysPrompt })

    // 携带上下文（受 settings.contextLength 限制）
    const contextMsgs = messages.value.slice(0, -1).slice(-settings.contextLength)
    for (const m of contextMsgs) {
      history.push({ role: m.role, content: m.content })
    }

    const opts = {
      model: selectedModel.value,
      stream: true,
      temperature: settings.temperature,
    }
    if (settings.webSearchEnabled) opts.tools = [{ type: 'web_search' }]

    let response
    if (img) {
      response = await puter.ai.chat(text, img, false, opts)
    } else {
      history.push({ role: 'user', content: text })
      response = await puter.ai.chat(history, false, opts)
    }

    messages.value.push({ role: 'assistant', content: '' })
    let full = ''
    for await (const part of response) {
      if (part?.text) {
        full += part.text
        messages.value[messages.value.length - 1].content = full
        chatViewRef.value?.scrollToBottom()
      }
    }

    if (settings.ttsEnabled && full) {
      const audio = await puter.ai.txt2speech(full.slice(0, 500), {
        provider: settings.ttsProvider,
        voice: settings.ttsVoice,
      })
      audio.play()
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: t('chat.error', { msg: e.message || e }) })
  } finally {
    isLoading.value = false
    chatViewRef.value?.scrollToBottom()
    chatViewRef.value?.focusInput()
  }
}

const speakText = async (text, idx) => {
  const puter = getPuter()
  if (!puter) return
  if (speakingIdx.value === idx) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null }
    speakingIdx.value = -1
    return
  }
  speakingIdx.value = idx
  try {
    const audio = await puter.ai.txt2speech(text.slice(0, 500), {
      provider: settings.ttsProvider,
      voice: settings.ttsVoice,
    })
    currentAudio = audio
    audio.play()
    audio.onended = () => { speakingIdx.value = -1; currentAudio = null }
  } catch { speakingIdx.value = -1 }
}

// ===== 语音输入 =====
const toggleRecording = async () => {
  if (isRecording.value) { stopRecording(); return }
  try {
    await startRecording(async (blob) => {
      const puter = getPuter()
      if (!puter) return
      try {
        const result = await puter.ai.speech2txt(blob)
        userInput.value += (userInput.value ? ' ' : '') + (typeof result === 'string' ? result : result.text || '')
      } catch (e) { console.error(e) }
    })
  } catch {
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

// ===== 文生图 =====
const generateImage = async () => {
  const puter = getPuter()
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const prompt = userInput.value.trim()
  userInput.value = ''
  isLoading.value = true
  generatedImages.value = []
  try {
    const img = await puter.ai.txt2img(prompt, {
      model: settings.imageModel,
      quality: settings.imageQuality,
    })
    generatedImages.value = [img.src]
  } catch (e) {
    await alert({ icon: '⚠️', title: t('image.failed', { msg: e.message || e }), showCancel: false })
  } finally {
    isLoading.value = false
  }
}

// ===== 语音转文字 =====
const toggleSTTRecording = async () => {
  if (isRecording.value) { stopRecording(); return }
  try {
    await startRecording(async (blob) => {
      const puter = getPuter()
      if (!puter) return
      isLoading.value = true
      try {
        const result = await puter.ai.speech2txt(blob)
        transcription.value = typeof result === 'string' ? result : result.text || JSON.stringify(result)
      } catch (e) {
        await alert({ icon: '⚠️', title: t('stt.failed', { msg: e.message }), showCancel: false })
      } finally {
        isLoading.value = false
      }
    })
  } catch {
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

const handleAudioUpload = async (e) => {
  const puter = getPuter()
  const file = e.target.files[0]
  if (!file || !puter) return
  isLoading.value = true
  transcription.value = ''
  try {
    const result = await puter.ai.speech2txt(file)
    transcription.value = typeof result === 'string' ? result : result.text || JSON.stringify(result)
  } catch (err) {
    await alert({ icon: '⚠️', title: t('stt.failed', { msg: err.message }), showCancel: false })
  } finally {
    isLoading.value = false
  }
}

// ===== 文字转语音 =====
const synthesizeSpeech = async () => {
  const puter = getPuter()
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const text = userInput.value.trim()
  isLoading.value = true
  audioUrl.value = null
  try {
    const audio = await puter.ai.txt2speech(text, {
      provider: settings.ttsProvider,
      voice: settings.ttsVoice,
    })
    audioUrl.value = audio.src
  } catch (e) {
    await alert({ icon: '⚠️', title: t('tts.failed', { msg: e.message }), showCancel: false })
  } finally {
    isLoading.value = false
  }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';
@import '@/styles/app.css';
</style>

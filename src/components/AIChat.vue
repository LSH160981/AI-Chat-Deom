<template>
  <div class="chat-app">
    <AppSidebar
      :open="sidebarOpen"
      v-model:currentMode="currentMode"
      v-model:selectedModel="selectedModel"
      v-model:systemPrompt="systemPrompt"
      v-model:temperature="temperature"
      v-model:webSearchEnabled="webSearchEnabled"
      v-model:ttsEnabled="ttsEnabled"
      v-model:ttsVoice="ttsVoice"
      v-model:ttsProvider="ttsProvider"
      v-model:imageModel="imageModel"
      @close="sidebarOpen = false"
      @newChat="newChat"
    />

    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <!-- 顶栏 -->
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

      <!-- 视图 -->
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

    <!-- 灯箱 -->
    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppSidebar from './AppSidebar.vue'
import ChatView from './views/ChatView.vue'
import ImageGenView from './views/ImageGenView.vue'
import SpeechToTextView from './views/SpeechToTextView.vue'
import TextToSpeechView from './views/TextToSpeechView.vue'
import { usePuter } from '@/composables/usePuter'
import { useRecorder } from '@/composables/useRecorder'
import { CHAT_MODES } from '@/config/models'

// ===== Puter SDK =====
const { puter: getPuter } = usePuter()

// ===== 状态 =====
const currentMode = ref('chat')
const sidebarOpen = ref(false)
const selectedModel = ref('claude-sonnet-4-5')
const systemPrompt = ref('')
const temperature = ref(0.7)
const webSearchEnabled = ref(false)
const ttsEnabled = ref(false)
const ttsVoice = ref('nova')
const ttsProvider = ref('openai')
const imageModel = ref('gpt-image-1-mini')

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

// ===== 录音 =====
const { isRecording, startRecording, stopRecording } = useRecorder()

// ===== 计算属性 =====
const currentModeLabel = computed(() => CHAT_MODES.find(m => m.id === currentMode.value)?.label || '')

// ===== 通用 =====
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
    if (systemPrompt.value) history.push({ role: 'system', content: systemPrompt.value })
    for (const m of messages.value.slice(0, -1)) {
      history.push({ role: m.role, content: m.content })
    }

    const opts = { model: selectedModel.value, stream: true, temperature: temperature.value }
    if (webSearchEnabled.value) opts.tools = [{ type: 'web_search' }]

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

    if (ttsEnabled.value && full) {
      const audio = await puter.ai.txt2speech(full.slice(0, 500), { provider: 'openai', voice: ttsVoice.value })
      audio.play()
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: `⚠️ 出错了：${e.message || e}` })
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
    const audio = await puter.ai.txt2speech(text.slice(0, 500), { provider: 'openai', voice: ttsVoice.value })
    currentAudio = audio
    audio.play()
    audio.onended = () => { speakingIdx.value = -1; currentAudio = null }
  } catch { speakingIdx.value = -1 }
}

// ===== 语音输入（Chat 模式麦克风）=====
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
  } catch { alert('麦克风权限被拒绝') }
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
    const img = await puter.ai.txt2img(prompt, { model: imageModel.value })
    generatedImages.value = [img.src]
  } catch (e) { alert('图片生成失败：' + (e.message || e)) }
  finally { isLoading.value = false }
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
      } catch (e) { alert('转录失败：' + e.message) }
      finally { isLoading.value = false }
    })
  } catch { alert('麦克风权限被拒绝') }
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
  } catch (err) { alert('转录失败：' + err.message) }
  finally { isLoading.value = false }
}

// ===== 文字转语音 =====
const synthesizeSpeech = async () => {
  const puter = getPuter()
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const text = userInput.value.trim()
  isLoading.value = true
  audioUrl.value = null
  try {
    const audio = await puter.ai.txt2speech(text, { provider: ttsProvider.value, voice: ttsVoice.value })
    audioUrl.value = audio.src
  } catch (e) { alert('语音合成失败：' + e.message) }
  finally { isLoading.value = false }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';
@import '@/styles/app.css';
</style>

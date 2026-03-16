<template>
  <div class="chat-app">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <span class="logo">✦ AI Chat</span>
        <button class="icon-btn" @click="newChat" title="新对话">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <div class="mode-list">
        <button v-for="m in modes" :key="m.id" class="mode-item" :class="{ active: currentMode === m.id }" @click="currentMode = m.id; sidebarOpen = false">
          <span class="mode-icon">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </button>
      </div>

      <div class="sidebar-divider"></div>

      <div class="sidebar-section">
        <p class="section-label">模型</p>
        <select v-model="selectedModel" class="model-select">
          <optgroup label="OpenAI">
            <option value="gpt-5-nano">GPT-5 Nano</option>
            <option value="gpt-5">GPT-5</option>
            <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
            <option value="openai/gpt-4o">GPT-4o</option>
            <option value="openai/o3-mini">o3-mini (推理)</option>
          </optgroup>
          <optgroup label="Anthropic">
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6 ★</option>
            <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
            <option value="claude-opus-4-5">Claude Opus 4.5</option>
            <option value="anthropic/claude-3-5-haiku">Claude 3.5 Haiku</option>
          </optgroup>
          <optgroup label="Google">
            <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="google/gemini-2.0-flash">Gemini 2.0 Flash</option>
          </optgroup>
          <optgroup label="xAI">
            <option value="x-ai/grok-3">Grok 3</option>
            <option value="x-ai/grok-3-mini">Grok 3 Mini</option>
          </optgroup>
          <optgroup label="DeepSeek">
            <option value="deepseek/deepseek-r1">DeepSeek R1</option>
            <option value="deepseek/deepseek-chat-v3-5">DeepSeek V3.5</option>
          </optgroup>
          <optgroup label="Meta">
            <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (免费)</option>
          </optgroup>
        </select>
      </div>

      <div v-if="currentMode === 'chat'" class="sidebar-section">
        <p class="section-label">系统提示词</p>
        <textarea v-model="systemPrompt" placeholder="设置 AI 的角色和行为..." class="system-prompt-input" rows="4"></textarea>
      </div>

      <div v-if="currentMode === 'chat'" class="sidebar-section">
        <p class="section-label">温度 <span class="section-value">{{ temperature }}</span></p>
        <input type="range" v-model.number="temperature" min="0" max="2" step="0.1" class="range-input" />
        <div class="range-labels"><span>精确</span><span>创意</span></div>
      </div>

      <div v-if="currentMode === 'chat'" class="sidebar-section">
        <label class="toggle-label">
          <input type="checkbox" v-model="webSearchEnabled" />
          <span>🌐 联网搜索</span>
        </label>
      </div>

      <div v-if="currentMode === 'chat'" class="sidebar-section">
        <label class="toggle-label">
          <input type="checkbox" v-model="ttsEnabled" />
          <span>🔊 自动朗读回复</span>
        </label>
        <select v-if="ttsEnabled" v-model="ttsVoice" class="model-select" style="margin-top:6px">
          <option value="alloy">Alloy</option>
          <option value="nova">Nova</option>
          <option value="echo">Echo</option>
          <option value="onyx">Onyx</option>
          <option value="shimmer">Shimmer</option>
          <option value="coral">Coral</option>
        </select>
      </div>

      <div v-if="currentMode === 'txt2img'" class="sidebar-section">
        <p class="section-label">图片模型</p>
        <select v-model="imageModel" class="model-select">
          <option value="gpt-image-1-mini">GPT Image 1 Mini</option>
          <option value="gpt-image-1">GPT Image 1</option>
          <option value="dall-e-3">DALL-E 3</option>
          <option value="grok-2-image">Grok Image (xAI)</option>
          <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash</option>
        </select>
      </div>

      <div v-if="currentMode === 'txt2speech'" class="sidebar-section">
        <p class="section-label">TTS 服务商</p>
        <select v-model="ttsProvider" class="model-select">
          <option value="openai">OpenAI</option>
          <option value="aws-polly">AWS Polly</option>
          <option value="elevenlabs">ElevenLabs</option>
        </select>
        <p class="section-label" style="margin-top:8px">声音</p>
        <select v-model="ttsVoice" class="model-select">
          <template v-if="ttsProvider === 'openai'">
            <option value="alloy">Alloy</option>
            <option value="nova">Nova</option>
            <option value="echo">Echo</option>
            <option value="onyx">Onyx</option>
            <option value="shimmer">Shimmer</option>
            <option value="coral">Coral</option>
          </template>
          <template v-else-if="ttsProvider === 'aws-polly'">
            <option value="Joanna">Joanna (英文女)</option>
            <option value="Matthew">Matthew (英文男)</option>
            <option value="Zhiyu">Zhiyu (中文女)</option>
          </template>
          <template v-else>
            <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
          </template>
        </select>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <header class="topbar">
        <button class="icon-btn" @click="sidebarOpen = !sidebarOpen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span class="topbar-title">{{ currentModeLabel }}</span>
        <button v-if="currentMode === 'chat' && messages.length > 0" class="icon-btn" @click="newChat" title="清空">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </header>

      <!-- Chat 模式 -->
      <template v-if="currentMode === 'chat'">
        <div ref="messagesEl" class="messages-area">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">✦</div>
            <h2>有什么可以帮你的？</h2>
            <p>{{ selectedModel }}</p>
          </div>
          <div v-else class="messages-list">
            <div v-for="(msg, i) in messages" :key="i" class="message-row" :class="msg.role">
              <div v-if="msg.role === 'assistant'" class="avatar ai-avatar">✦</div>
              <div class="message-content" :class="msg.role">
                <img v-if="msg.role === 'user' && msg.image" :src="msg.image" class="msg-image" />
                <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderContent(msg.content)"></div>
                <div v-else class="user-text">{{ msg.content }}</div>
                <button v-if="msg.role === 'assistant' && msg.content" class="msg-tts-btn" @click="speakText(msg.content, i)" :title="speakingIdx === i ? '停止' : '朗读'">
                  {{ speakingIdx === i ? '⏹' : '🔊' }}
                </button>
              </div>
            </div>
            <div v-if="isLoading" class="message-row assistant">
              <div class="avatar ai-avatar">✦</div>
              <div class="message-content assistant">
                <div class="typing-dots"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="attachedImage" class="attached-preview">
          <img :src="attachedImage" />
          <button @click="attachedImage = null" class="remove-attach">✕</button>
        </div>

        <div class="input-area">
          <div class="input-wrapper" :class="{ focused: isFocused }">
            <label class="attach-btn" title="上传图片">
              <input type="file" accept="image/*" @change="handleImageUpload" style="display:none" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </label>
            <button class="attach-btn" :class="{ recording: isRecording }" @click="toggleRecording" title="语音输入">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
            <textarea ref="inputEl" v-model="userInput" @keydown.enter.exact.prevent="sendMessage" @focus="isFocused = true" @blur="isFocused = false" @input="autoResize" placeholder="给 AI 发消息..." rows="1" :disabled="isLoading" class="input-textarea"></textarea>
            <button @click="sendMessage" :disabled="!userInput.trim() || isLoading" class="send-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L8 15M8 1L3 6M8 1L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <p class="disclaimer">AI 生成内容可能存在错误，请核实重要信息</p>
        </div>
      </template>

      <!-- 文生图 -->
      <template v-else-if="currentMode === 'txt2img'">
        <div class="gen-area">
          <div v-if="generatedImages.length === 0 && !isLoading" class="empty-state">
            <div class="empty-icon">🎨</div>
            <h2>AI 图片生成</h2>
            <p>描述你想要的图片</p>
          </div>
          <div v-if="isLoading" class="gen-loading"><div class="gen-spinner"></div><p>正在生成图片...</p></div>
          <div v-if="generatedImages.length > 0" class="image-grid">
            <div v-for="(img, i) in generatedImages" :key="i" class="image-item">
              <img :src="img" @click="lightboxSrc = img" />
              <a :href="img" download="ai-image.png" class="download-btn">↓ 下载</a>
            </div>
          </div>
          <div class="input-area">
            <div class="input-wrapper" :class="{ focused: isFocused }">
              <textarea v-model="userInput" @keydown.enter.exact.prevent="generateImage" @focus="isFocused = true" @blur="isFocused = false" placeholder="描述你想要的图片，例如：一只在咖啡馆读书的猫..." rows="2" :disabled="isLoading" class="input-textarea"></textarea>
              <button @click="generateImage" :disabled="!userInput.trim() || isLoading" class="send-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 语音转文字 -->
      <template v-else-if="currentMode === 'speech2txt'">
        <div class="gen-area">
          <div v-if="!transcription && !isLoading" class="empty-state">
            <div class="empty-icon">🎙️</div>
            <h2>语音转文字</h2>
            <p>录音或上传音频文件</p>
          </div>
          <div v-if="isLoading" class="gen-loading"><div class="gen-spinner"></div><p>正在转录...</p></div>
          <div v-if="transcription" class="transcription-result">
            <p>{{ transcription }}</p>
            <button @click="transcription = ''" class="clear-result">清空</button>
          </div>
          <div class="input-area speech-actions">
            <button class="record-big-btn" :class="{ recording: isRecording }" @click="toggleSTTRecording">
              {{ isRecording ? '⏹ 停止录音' : '🎙 开始录音' }}
            </button>
            <div class="or-divider">或</div>
            <label class="upload-audio-btn">
              <input type="file" accept="audio/*" @change="handleAudioUpload" style="display:none" />
              📁 上传音频文件
            </label>
          </div>
        </div>
      </template>

      <!-- 文字转语音 -->
      <template v-else-if="currentMode === 'txt2speech'">
        <div class="gen-area">
          <div v-if="!audioUrl && !isLoading" class="empty-state">
            <div class="empty-icon">🔊</div>
            <h2>文字转语音</h2>
            <p>支持 OpenAI / AWS Polly / ElevenLabs</p>
          </div>
          <div v-if="isLoading" class="gen-loading"><div class="gen-spinner"></div><p>正在合成语音...</p></div>
          <div v-if="audioUrl" class="audio-player">
            <audio controls :src="audioUrl" autoplay></audio>
          </div>
          <div class="input-area">
            <div class="input-wrapper" :class="{ focused: isFocused }">
              <textarea v-model="userInput" @focus="isFocused = true" @blur="isFocused = false" placeholder="输入要转换为语音的文字..." rows="3" :disabled="isLoading" class="input-textarea"></textarea>
              <button @click="synthesizeSpeech" :disabled="!userInput.trim() || isLoading" class="send-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- 图片灯箱 -->
    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import katex from 'katex'

const langMap = { javascript, python, css, xml, json, bash, typescript, java, c, cpp, go, rust, sql, js: javascript, html: xml, shell: bash, ts: typescript, py: python }
Object.entries(langMap).forEach(([k, v]) => hljs.registerLanguage(k, v))

const currentMode = ref('chat')
const sidebarOpen = ref(false)
const selectedModel = ref('claude-sonnet-4-6')
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
const isFocused = ref(false)
const inputEl = ref(null)
const messagesEl = ref(null)
const attachedImage = ref(null)
const generatedImages = ref([])
const transcription = ref('')
const audioUrl = ref(null)
const isRecording = ref(false)
const speakingIdx = ref(-1)
const lightboxSrc = ref(null)
let mediaRecorder = null
let audioChunks = []
let puter = null
let currentAudio = null

const modes = [
  { id: 'chat', icon: '💬', label: 'AI 对话' },
  { id: 'txt2img', icon: '🎨', label: '文生图' },
  { id: 'speech2txt', icon: '🎙️', label: '语音转文字' },
  { id: 'txt2speech', icon: '🔊', label: '文字转语音' },
]
const currentModeLabel = computed(() => modes.find(m => m.id === currentMode.value)?.label || '')

const md = new MarkdownIt({
  html: true, linkify: true, typographer: true,
  highlight(str, lang) {
    let highlighted = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (lang && hljs.getLanguage(lang)) {
      try { highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value } catch {}
    }
    return `<div class="code-block"><div class="code-header"><span class="lang-label">${lang || 'text'}</span><button class="copy-btn" onclick="copyCode(this)">复制</button></div><pre class="hljs"><code>${highlighted}</code></pre></div>`
  }
})

const renderContent = (content) => {
  if (!content) return ''
  try {
    content = content.replace(/\$\$([^$]+)\$\$/g, (_, tex) => { try { return katex.renderToString(tex, { throwOnError: false, displayMode: true }) } catch { return _ } })
    content = content.replace(/\$([^$\n]+)\$/g, (_, tex) => { try { return katex.renderToString(tex, { throwOnError: false }) } catch { return _ } })
    return md.render(content)
  } catch { return content }
}

window.copyCode = async (btn) => {
  const code = btn.closest('.code-block').querySelector('code').textContent
  try { await navigator.clipboard.writeText(code); btn.textContent = '已复制'; setTimeout(() => { btn.textContent = '复制' }, 2000) } catch { btn.textContent = '失败' }
}

const scrollToBottom = () => nextTick(() => { if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight })
const autoResize = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }
const newChat = () => { messages.value = []; userInput.value = ''; attachedImage.value = null }

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { attachedImage.value = ev.target.result }
  reader.readAsDataURL(file)
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const text = userInput.value.trim()
  const img = attachedImage.value
  userInput.value = ''
  attachedImage.value = null
  if (inputEl.value) inputEl.value.style.height = 'auto'

  messages.value.push({ role: 'user', content: text, image: img })
  isLoading.value = true
  scrollToBottom()

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
        scrollToBottom()
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
    scrollToBottom()
    nextTick(() => inputEl.value?.focus())
  }
}

const speakText = async (text, idx) => {
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

const generateImage = async () => {
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

const startRecording = async (onStop) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  audioChunks = []
  mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop())
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    await onStop(blob)
  }
  mediaRecorder.start()
  isRecording.value = true
}

const toggleRecording = async () => {
  if (isRecording.value) { mediaRecorder?.stop(); isRecording.value = false; return }
  try {
    await startRecording(async (blob) => {
      try {
        const result = await puter.ai.speech2txt(blob)
        userInput.value += (userInput.value ? ' ' : '') + (typeof result === 'string' ? result : result.text || '')
      } catch (e) { console.error(e) }
    })
  } catch { alert('麦克风权限被拒绝') }
}

const toggleSTTRecording = async () => {
  if (isRecording.value) { mediaRecorder?.stop(); isRecording.value = false; return }
  try {
    isLoading.value = false
    await startRecording(async (blob) => {
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

const synthesizeSpeech = async () => {
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

onMounted(() => {
  const s = document.createElement('script')
  s.src = 'https://js.puter.com/v2/'
  s.onload = () => { puter = window.puter; nextTick(() => inputEl.value?.focus()) }
  document.head.appendChild(s)
})
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1a1a1a; }

.chat-app { display: flex; height: 100vh; overflow: hidden; }

/* 侧边栏 */
.sidebar {
  width: 260px; flex-shrink: 0; background: #f8f8f8; border-right: 1px solid #eee;
  display: flex; flex-direction: column; overflow-y: auto; padding-bottom: 20px;
  transition: transform 0.25s;
}
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #eee; }
.logo { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.mode-list { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
.mode-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: #555; text-align: left; transition: background 0.15s; }
.mode-item:hover { background: #efefef; }
.mode-item.active { background: #e8e8e8; color: #1a1a1a; font-weight: 600; }
.mode-icon { font-size: 16px; }
.sidebar-divider { height: 1px; background: #eee; margin: 4px 0; }
.sidebar-section { padding: 12px 14px 0; }
.section-label { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.section-value { font-weight: 400; color: #555; text-transform: none; }
.model-select { width: 100%; padding: 7px 10px; border: 1px solid #e0e0e0; border-radius: 7px; font-size: 13px; background: #fff; color: #1a1a1a; outline: none; cursor: pointer; }
.model-select:focus { border-color: #aaa; }
.system-prompt-input { width: 100%; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 7px; font-size: 13px; font-family: inherit; resize: vertical; background: #fff; color: #1a1a1a; outline: none; }
.system-prompt-input:focus { border-color: #aaa; }
.range-input { width: 100%; accent-color: #1a1a1a; }
.range-labels { display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-top: 2px; }
.toggle-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; cursor: pointer; }
.toggle-label input { accent-color: #1a1a1a; }

/* 遮罩 */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 10; }

/* 主区域 */
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.topbar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.topbar-title { flex: 1; font-size: 15px; font-weight: 600; color: #333; }
.icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; border-radius: 6px; color: #666; transition: background 0.15s; }
.icon-btn:hover { background: #f0f0f0; }

/* 消息区 */
.messages-area { flex: 1; overflow-y: auto; padding: 32px 20px 16px; }
.messages-area::-webkit-scrollbar { width: 5px; }
.messages-area::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: #999; gap: 10px; }
.empty-icon { font-size: 40px; color: #ccc; margin-bottom: 8px; }
.empty-state h2 { font-size: 22px; font-weight: 600; color: #333; }
.empty-state p { font-size: 13px; }

.messages-list { display: flex; flex-direction: column; gap: 24px; max-width: 760px; margin: 0 auto; width: 100%; }
.message-row { display: flex; gap: 12px; align-items: flex-start; }
.message-row.user { flex-direction: row-reverse; }
.avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ai-avatar { background: #f0f0f0; color: #555; font-size: 14px; }
.message-content { max-width: 85%; line-height: 1.65; font-size: 15px; position: relative; }
.message-content.assistant { color: #1a1a1a; }
.user-text { background: #f4f4f4; padding: 10px 14px; border-radius: 14px 14px 4px 14px; white-space: pre-wrap; word-break: break-word; }
.msg-image { max-width: 240px; border-radius: 8px; margin-bottom: 6px; display: block; }
.msg-tts-btn { background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.4; padding: 2px 4px; border-radius: 4px; margin-top: 4px; display: inline-block; }
.msg-tts-btn:hover { opacity: 1; background: #f0f0f0; }

.typing-dots { display: flex; gap: 4px; padding: 12px 0; }
.typing-dots span { width: 7px; height: 7px; background: #bbb; border-radius: 50%; animation: bounce 1.2s infinite; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-6px); opacity: 1; } }

/* 图片预览 */
.attached-preview { padding: 0 20px 8px; max-width: 800px; margin: 0 auto; width: 100%; position: relative; display: inline-flex; }
.attached-preview img { max-height: 80px; border-radius: 8px; }
.remove-attach { position: absolute; top: -4px; right: 24px; background: #666; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* 输入区 */
.input-area { padding: 10px 20px 18px; background: #fff; flex-shrink: 0; }
.input-wrapper { display: flex; align-items: flex-end; gap: 6px; border: 1.5px solid #e0e0e0; border-radius: 14px; padding: 8px 8px 8px 10px; transition: border-color 0.2s; max-width: 760px; margin: 0 auto; }
.input-wrapper.focused { border-color: #aaa; }
.attach-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; color: #999; border-radius: 6px; flex-shrink: 0; transition: color 0.15s, background 0.15s; }
.attach-btn:hover { color: #555; background: #f0f0f0; }
.attach-btn.recording { color: #e53e3e; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.input-textarea { flex: 1; border: none; outline: none; resize: none; font-size: 15px; font-family: inherit; line-height: 1.5; max-height: 160px; background: transparent; color: #1a1a1a; }
.input-textarea::placeholder { color: #bbb; }
.send-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #1a1a1a; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.2s; }
.send-btn:disabled { background: #e0e0e0; color: #bbb; cursor: not-allowed; }
.send-btn:not(:disabled):hover { background: #333; }
.disclaimer { text-align: center; color: #bbb; font-size: 11px; margin-top: 6px; max-width: 760px; margin-left: auto; margin-right: auto; }

/* 生成区 */
.gen-area { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
.gen-loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #999; }
.gen-spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #555; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.image-grid { display: flex; flex-wrap: wrap; gap: 16px; padding: 24px 20px; justify-content: center; }
.image-item { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.image-item img { max-width: 400px; max-height: 400px; border-radius: 12px; cursor: zoom-in; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.download-btn { font-size: 13px; color: #555; text-decoration: none; padding: 4px 12px; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
.download-btn:hover { background: #f5f5f5; }

/* 语音操作 */
.speech-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px; }
.record-big-btn { padding: 14px 32px; border-radius: 50px; border: none; background: #1a1a1a; color: #fff; font-size: 16px; cursor: pointer; transition: background 0.2s; }
.record-big-btn:hover { background: #333; }
.record-big-btn.recording { background: #e53e3e; animation: pulse 1s infinite; }
.or-divider { color: #bbb; font-size: 13px; }
.upload-audio-btn { padding: 10px 24px; border: 1.5px dashed #ddd; border-radius: 8px; font-size: 14px; color: #666; cursor: pointer; transition: border-color 0.2s; }
.upload-audio-btn:hover { border-color: #aaa; color: #333; }

.transcription-result { flex: 1; padding: 24px 20px; max-width: 760px; margin: 0 auto; width: 100%; }
.transcription-result p { font-size: 16px; line-height: 1.7; color: #1a1a1a; background: #f9f9f9; padding: 16px; border-radius: 10px; }
.clear-result { margin-top: 12px; padding: 6px 16px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; color: #666; }

.audio-player { padding: 24px 20px; display: flex; justify-content: center; }
.audio-player audio { width: 100%; max-width: 500px; }

/* 灯箱 */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; cursor: zoom-out; }
.lightbox img { max-width: 90vw; max-height: 90vh; border-radius: 8px; }

/* Markdown */
.markdown-body { font-size: 15px; line-height: 1.7; }
.markdown-body p { margin-bottom: 12px; }
.markdown-body p:last-child { margin-bottom: 0; }
.markdown-body h1,.markdown-body h2,.markdown-body h3 { margin: 18px 0 10px; font-weight: 600; }
.markdown-body h1 { font-size: 1.4em; } .markdown-body h2 { font-size: 1.2em; } .markdown-body h3 { font-size: 1.05em; }
.markdown-body ul,.markdown-body ol { padding-left: 22px; margin-bottom: 12px; }
.markdown-body li { margin-bottom: 4px; }
.markdown-body code { background: #f3f3f3; padding: 2px 5px; border-radius: 4px; font-size: 13px; font-family: 'Menlo','Consolas',monospace; color: #d14; }
.markdown-body blockquote { border-left: 3px solid #ddd; padding: 4px 12px; margin: 10px 0; color: #777; }
.markdown-body a { color: #0066cc; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.markdown-body th,.markdown-body td { border: 1px solid #e5e5e5; padding: 7px 12px; text-align: left; font-size: 14px; }
.markdown-body th { background: #f8f8f8; font-weight: 600; }
.markdown-body hr { border: none; border-top: 1px solid #ebebeb; margin: 16px 0; }

.code-block { border-radius: 10px; overflow: hidden; margin: 12px 0; background: #0d1117; }
.code-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #161b22; }
.lang-label { font-size: 12px; color: #8b949e; font-family: monospace; }
.copy-btn { font-size: 12px; color: #8b949e; background: transparent; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: color 0.2s; }
.copy-btn:hover { color: #fff; }
.hljs { padding: 14px !important; margin: 0 !important; border-radius: 0 !important; font-size: 13px; }
pre.hljs code { background: transparent; padding: 0; color: inherit; }

.katex { font-size: 1.05em; }
.katex-display { margin: 14px 0; overflow-x: auto; }

@media (max-width: 640px) {
  .sidebar { position: fixed; top: 0; left: 0; height: 100%; z-index: 20; transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .messages-area { padding: 16px 14px 10px; }
  .input-area { padding: 8px 14px 14px; }
  .message-content { max-width: 92%; }
}
</style>

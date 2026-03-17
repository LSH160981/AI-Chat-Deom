<!--
  ============================================================
  文件说明：AIChat.vue
  功能：应用主入口组件，负责整体布局与多模式功能协调。
  包含：
    - 侧边栏（AppSidebar）展开/收起
    - 四种功能模式切换：聊天（chat）、文生图（txt2img）、
      语音转文字（speech2txt）、文字转语音（txt2speech）
    - 聊天消息流式收发、多轮上下文管理
    - 语音录入（VAD）、图片上传与附件预览
    - 图片生成、STT 独立页、TTS 独立页
    - 图片灯箱（lightbox）大图预览
  依赖：AppSidebar、ChatView、ImageGenView、SpeechToTextView、
        TextToSpeechView、useRecorder、useModal、useApiClient、
        settings store
  ============================================================
-->
<template>
  <div class="chat-app">
    <!-- 侧边栏：传入 open 状态及双向绑定的模式/模型/系统提示 -->
    <AppSidebar
      :open="sidebarOpen"
      v-model:currentMode="currentMode"
      v-model:selectedModel="selectedModel"
      v-model:systemPrompt="sessionSystemPrompt"
      @close="sidebarOpen = false"
      @newChat="newChat"
    />

    <!-- 遮罩层：侧边栏打开时显示，点击关闭侧边栏 -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <!-- 顶部导航栏 -->
      <header class="topbar">
        <!-- 汉堡菜单按钮：切换侧边栏开关 -->
        <button class="icon-btn topbar-menu-btn" @click="sidebarOpen = !sidebarOpen">
          <AppIcon name="menu" :size="18" />
        </button>
        <!-- 当前模式标题 -->
        <span class="topbar-title">{{ currentModeLabel }}</span>
        <!-- 清空按钮：仅在聊天模式且有消息时显示 -->
        <button v-if="currentMode === MODE.CHAT && messages.length > 0" class="icon-btn" @click="newChat" :title="$t('common.clear')">
          <AppIcon name="trash" :size="16" />
        </button>
      </header>

      <!-- 未配置 API 时的引导提示 -->
      <div v-if="!settings.apiBaseUrl" class="no-api-banner">
        <div class="no-api-inner">
          <span>⚙️</span>
          <span>请先在<router-link to="/settings">设置</router-link>中填写 API 地址和密钥</span>
        </div>
      </div>

      <!--
        聊天视图：模式为 chat 时渲染
        ref="chatViewRef" 用于父组件调用子组件暴露的方法（滚动/聚焦/重置）
      -->
      <ChatView
        v-if="currentMode === MODE.CHAT"
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

      <!-- 文生图视图：模式为 txt2img 时渲染 -->
      <ImageGenView
        v-else-if="currentMode === MODE.TXT2IMG"
        :generatedImages="generatedImages"
        :isLoading="isLoading"
        v-model="userInput"
        @generate="generateImage"
        @preview="lightboxSrc = $event"
      />

      <!-- 语音转文字视图：模式为 speech2txt 时渲染 -->
      <SpeechToTextView
        v-else-if="currentMode === MODE.SPEECH2TXT"
        :transcription="transcription"
        :isLoading="isLoading"
        :isRecording="isRecording"
        @toggleRecording="toggleSTTRecording"
        @upload="handleAudioUpload"
        @clear="transcription = ''"
      />

      <!-- 文字转语音视图：模式为 txt2speech 时渲染 -->
      <TextToSpeechView
        v-else-if="currentMode === MODE.TXT2SPEECH"
        :audioUrl="audioUrl"
        :isLoading="isLoading"
        v-model="userInput"
        @synthesize="doSynthesize"
      />
    </main>

    <!-- 灯箱：点击图片大图预览，点击任意处关闭 -->
    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
      <img :src="lightboxSrc" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ChatView from '@/components/chat/ChatView.vue'
import ImageGenView from '@/components/chat/ImageGenView.vue'
import SpeechToTextView from '@/components/chat/SpeechToTextView.vue'
import TextToSpeechView from '@/components/chat/TextToSpeechView.vue'
import { useRecorder } from '@/composables/useRecorder'
import { useModal } from '@/composables/useModal'
import { sendChatMessage, generateImage as apiGenerateImage, transcribeAudio, synthesizeSpeech } from '@/api'
import { CHAT_MODES } from '@/constants/models'
import { settings } from '@/stores/settings'

/** 功能模式 ID 常量，避免散落的魔法字符串 */
const MODE = {
  CHAT:       'chat',
  TXT2IMG:    'txt2img',
  SPEECH2TXT: 'speech2txt',
  TXT2SPEECH: 'txt2speech',
}

// 国际化翻译函数
const { t } = useI18n()
// 全局模态弹窗（alert/confirm）
const { alert } = useModal()

// ===== 会话状态 =====

/** 当前功能模式：chat / txt2img / speech2txt / txt2speech */
const currentMode = ref(MODE.CHAT)

/** 侧边栏是否打开 */
const sidebarOpen = ref(false)

/** 当前选中的模型 ID，默认读取全局设置 */
const selectedModel = ref(settings.defaultModel || '')

/** 当前会话使用的系统提示词（可在侧边栏单独修改，不影响全局设置） */
const sessionSystemPrompt = ref(settings.systemPrompt)

/** 聊天消息列表，每条消息格式：{ role, content, image? } */
const messages = ref([])

/** 用户输入框内容（多视图共用同一变量） */
const userInput = ref('')

/** 是否正在等待 API 响应 */
const isLoading = ref(false)

/** 用户粘贴/上传的图片（base64 DataURL），用于视觉模型 */
const attachedImage = ref(null)

/** 文生图结果 URL 列表 */
const generatedImages = ref([])

/** 语音转文字结果文本 */
const transcription = ref('')

/** 文字转语音生成的音频 URL（blob URL 或远程 URL） */
const audioUrl = ref(null)

/** 当前正在朗读的消息索引，-1 表示未在朗读 */
const speakingIdx = ref(-1)

/** 灯箱当前显示的图片 src，null 表示关闭 */
const lightboxSrc = ref(null)

/** ChatView 子组件引用，用于调用 scrollToBottom / focusInput / resetInputHeight */
const chatViewRef = ref(null)

/** 当前播放的 Audio 实例，用于停止朗读 */
let currentAudio = null

/** 当前流式请求的 AbortController，用于中断请求 */
let abortController = null

// 语音录音 composable，提供 isRecording / startRecording / stopRecording
const { isRecording, startRecording, stopRecording } = useRecorder()

/**
 * computed：当前模式的显示标签
 * 从 CHAT_MODES 配置中根据 currentMode.id 查找对应 label
 */
const currentModeLabel = computed(() => CHAT_MODES.find(m => m.id === currentMode.value)?.label || '')

/**
 * 开始新对话：清空消息列表、输入内容、附件，并中断正在进行的流式请求
 */
const newChat = () => {
  messages.value = []
  userInput.value = ''
  attachedImage.value = null
  abortController?.abort() // 中断当前流式请求（如有）
}

/**
 * 处理图片上传事件
 * 将用户选择的图片文件读取为 base64 DataURL，存入 attachedImage
 * @param {Event} e - input[type=file] 的 change 事件
 */
const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  // 读取完成后将结果存入响应式变量
  reader.onload = (ev) => { attachedImage.value = ev.target.result }
  reader.readAsDataURL(file) // 以 DataURL 方式读取
}

// ===== Chat =====

/**
 * 发送聊天消息（支持流式响应）
 * 流程：
 *   1. 校验输入、模型、API 配置
 *   2. 将用户消息推入列表
 *   3. 构建携带系统提示和历史上下文的 messages 数组
 *   4. 追加空 assistant 消息占位，通过 onChunk 逐步填充内容
 *   5. 完成后可选触发自动 TTS 朗读
 */
const sendMessage = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return // 空内容或正在加载时不处理

  const model = selectedModel.value || settings.defaultModel
  if (!model) {
    // 未选择模型时弹窗提示
    await alert({ icon: '⚙️', title: '未选择模型', message: '请先在设置页检测模型，或手动输入模型 ID', showCancel: false })
    return
  }
  if (!settings.apiBaseUrl) {
    // 未配置 API 地址时弹窗提示
    await alert({ icon: '⚙️', title: '未配置 API', message: '请先在设置页填写 API 地址和密钥', showCancel: false })
    return
  }

  const img = attachedImage.value // 暂存图片，发送后清空
  userInput.value = ''            // 清空输入框
  attachedImage.value = null      // 清空附件
  chatViewRef.value?.resetInputHeight() // 重置输入框高度

  // 将用户消息推入消息列表（含可选图片）
  const userMsg = { role: 'user', content: text, image: img }
  messages.value.push(userMsg)
  isLoading.value = true
  chatViewRef.value?.scrollToBottom() // 滚动到最新消息

  // 构建发送给 API 的历史消息数组
  const history = []
  const sysPrompt = sessionSystemPrompt.value || settings.systemPrompt
  if (sysPrompt) history.push({ role: 'system', content: sysPrompt }) // 添加系统提示

  // 取最近 contextLength 条历史（不含刚刚推入的用户消息）
  const ctxMsgs = messages.value.slice(0, -1).slice(-settings.contextLength)
  for (const m of ctxMsgs) history.push({ role: m.role, content: m.content })
  history.push({ role: 'user', content: text }) // 添加当前用户消息

  // 追加空 assistant 消息占位，流式输出时在此追加内容
  messages.value.push({ role: 'assistant', content: '' })
  abortController = new AbortController() // 创建新的中断控制器

  try {
    await sendChatMessage({
      messages: history,
      model,
      temperature: settings.temperature,
      signal: abortController.signal, // 传入中断信号
      onChunk: (chunk) => {
        // 流式回调：每收到一个 token 片段，追加到最后一条 assistant 消息
        messages.value[messages.value.length - 1].content += chunk
        chatViewRef.value?.scrollToBottom() // 实时滚动跟随
      },
    })

    // 自动 TTS：若设置开启，则对 AI 回复进行语音合成（限前500字）
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
      // 非用户主动中断时，在消息中显示错误信息
      messages.value[messages.value.length - 1].content = `❌ ${e.message}`
    }
  } finally {
    isLoading.value = false
    chatViewRef.value?.scrollToBottom()
    chatViewRef.value?.focusInput() // 恢复输入框焦点
  }
}

/**
 * 朗读指定消息文本（TTS 按需朗读）
 * 若当前正在朗读同一条消息则停止，否则开始朗读
 * @param {string} text - 要朗读的文本内容
 * @param {number} idx  - 消息在列表中的索引（用于高亮标记）
 */
const speakText = async (text, idx) => {
  if (speakingIdx.value === idx) {
    // 再次点击同一条消息：停止朗读
    currentAudio?.pause()
    currentAudio = null
    speakingIdx.value = -1
    return
  }
  speakingIdx.value = idx // 标记当前朗读的消息
  try {
    // 调用 TTS API 获取音频 URL（最多500字）
    const url = await synthesizeSpeech({ text: text.slice(0, 500), voice: settings.ttsVoice, model: settings.ttsModel || 'tts-1' })
    currentAudio = new Audio(url)
    currentAudio.play()
    // 播放结束后重置朗读状态
    currentAudio.onended = () => { speakingIdx.value = -1; currentAudio = null }
  } catch { speakingIdx.value = -1 } // 失败时重置状态
}

// ===== 语音输入 =====

/**
 * 切换聊天界面的语音录音状态
 * 录音结束后自动调用 STT API 将语音转为文字并追加到输入框
 */
const toggleRecording = async () => {
  if (isRecording.value) { stopRecording(); return } // 正在录音则停止
  try {
    await startRecording(async (blob) => {
      // 录音完成回调：调用转写 API
      try {
        const text = await transcribeAudio(blob)
        // 将转写结果追加到输入框（如果已有内容则加空格分隔）
        userInput.value += (userInput.value ? ' ' : '') + text
      } catch (e) {
          // TODO: 接入统一 logger
          if (import.meta.env.DEV) console.error('[ChatPage]', e)
        }
    })
  } catch {
    // 麦克风权限被拒绝时弹窗提示
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

// ===== 文生图 =====

/**
 * 调用图像生成 API 生成图片
 * 使用 userInput 作为提示词，结果存入 generatedImages
 */
const generateImage = async () => {
  const prompt = userInput.value.trim()
  if (!prompt || isLoading.value) return // 空提示词或正在加载时不处理
  userInput.value = ''          // 清空输入框
  isLoading.value = true
  generatedImages.value = []    // 清空上一次结果
  try {
    const url = await apiGenerateImage({
      prompt,
      model: settings.imageModel || 'dall-e-3',       // 图像生成模型
      size: settings.imageSize || '1024x1024',         // 图像尺寸
      quality: settings.imageQuality || 'standard',    // 图像质量
    })
    generatedImages.value = [url] // 将生成的图片 URL 存入列表
  } catch (e) {
    await alert({ icon: '⚠️', title: `生成失败：${e.message}`, showCancel: false })
  } finally {
    isLoading.value = false
  }
}

// ===== STT 独立页 =====

/**
 * 切换语音转文字页面的录音状态
 * 录音结束后自动转写，结果存入 transcription
 */
const toggleSTTRecording = async () => {
  if (isRecording.value) { stopRecording(); return } // 正在录音则停止
  try {
    await startRecording(async (blob) => {
      // 录音完成回调：调用转写 API
      isLoading.value = true
      try {
        transcription.value = await transcribeAudio(blob) // 存储转写结果
      } catch (e) {
        await alert({ icon: '⚠️', title: `转写失败：${e.message}`, showCancel: false })
      } finally { isLoading.value = false }
    })
  } catch {
    // 麦克风权限被拒绝时弹窗提示
    await alert({ icon: '🎙️', title: t('stt.micDenied'), showCancel: false })
  }
}

/**
 * 处理音频文件上传并转写
 * 用户通过文件选择器上传音频文件，调用 STT API 转写
 * @param {Event} e - input[type=file] 的 change 事件
 */
const handleAudioUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  isLoading.value = true
  transcription.value = '' // 清空上一次结果
  try {
    transcription.value = await transcribeAudio(file) // 直接传 File 对象
  } catch (err) {
    await alert({ icon: '⚠️', title: `转写失败：${err.message}`, showCancel: false })
  } finally { isLoading.value = false }
}

// ===== TTS 独立页 =====

/**
 * 执行文字转语音合成
 * 将 userInput 文本发送给 TTS API，生成音频并存入 audioUrl
 */
const doSynthesize = async () => {
  const text = userInput.value.trim()
  if (!text || isLoading.value) return // 空文本或正在加载时不处理
  isLoading.value = true
  audioUrl.value = null // 清空旧音频
  try {
    // 调用合成 API，传入文本、音色和模型
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

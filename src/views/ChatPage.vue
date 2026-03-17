<!--
  ============================================================
  文件说明：ChatPage.vue（主页）
  功能：应用主入口组件，负责整体布局与多模式功能协调。
  包含：
    - 侧边栏（AppSidebar）展开/收起
    - 四种功能模式切换：聊天（chat）、文生图（txt2img）、
      语音转文字（speech2txt）、文字转语音（txt2speech）
    - 聊天消息流式收发、多轮上下文管理
    - 语音录入（VAD）、图片上传与附件预览
    - 图片生成、STT 独立页、TTS 独立页
    - 图片灯箱（lightbox）大图预览
  依赖：AppSidebar、ChatView、useModal、settings store
  ============================================================
-->
<template>
  <div class="chat-app">
    <!-- 侧边栏：传入 open 状态及双向绑定的模式/模型/系统提示 -->
    <AppSidebar
      :open="sidebarOpen"
      v-model:currentMode="currentMode"
      :sessions="sessions"
      :activeSessionId="activeSessionId"
      @selectSession="selectSession"
      @renameSession="renameSession"
      @deleteSession="deleteSession"
      @close="sidebarOpen = false"
      @newChat="createNewSession"
    />

    <!-- 遮罩层：侧边栏打开时显示，点击关闭侧边栏 -->
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false"></div>

    <main class="main-area">
      <!-- 顶部导航栏 -->
      <header class="topbar">
        <!-- 汉堡菜单按钮：切换侧边栏开关 -->
        <button class="icon-btn topbar-menu-btn" @click="sidebarOpen = !sidebarOpen" :title="$t('common.menu')">
          <AppIcon name="menu" :size="18" />
        </button>
        <!-- 当前模式标题 -->
        <div class="topbar-title-row">
          <span class="topbar-title">{{ currentModeLabel }}</span>

          <!-- 仅聊天模式显示模型选择（在标题旁边） -->
          <FancySelect
            v-if="currentMode === MODE.CHAT && settings.detectedModels?.length"
            class="topbar-model-fancy"
            :modelValue="selectedModel"
            @update:modelValue="(v) => selectedModel = v"
            :items="modelSelectItems"
            placeholder="选择模型"
          />

          <input
            v-else-if="currentMode === MODE.CHAT"
            class="topbar-model-input"
            :value="selectedModel"
            @input="selectedModel = $event.target.value"
            placeholder="模型ID…"
          />
        </div>
        <!-- 设置入口：右上角 -->
        <router-link class="icon-btn" to="/settings" :title="$t('common.settings')">
          <AppIcon name="settings" :size="16" />
        </router-link>


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
        v-model="userInput"
        @send="sendMessage"
        @clear="newChat"
        @stop="stopGenerating"
        @regenerate="regenerateLast"
      />

    </main>

  </div>
</template>

<script setup>
/**
 * @file src/views/ChatPage.vue
 * @description 应用主页（多模式工作台）
 *
 * 主要负责：
 * - 顶部 Topbar（当前模式标题 / 模型选择 / 设置入口）
 * - 侧边栏（模式切换）
 * - 单一聊天视图（仅保留对话模式）
 * - 聊天流式发送、停止、重新回答、上下文拼接等核心业务逻辑
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ChatView from '@/components/chat/ChatView.vue'
import { useModal } from '@/composables/useModal'
import FancySelect from '@/components/ui/FancySelect.vue'
import { sendChatMessage } from '@/api'
import { CHAT_MODES } from '@/constants/models'
import { settings } from '@/stores/settings'
import { storage } from '@/utils/storage'

/**
 * computed：把 settings.detectedModels 按 group 分组，供顶部模型下拉使用
 */
const modelGroups = computed(() => {
  const map = {}
  for (const m of (settings.detectedModels || [])) {
    if (!map[m.group]) map[m.group] = []
    map[m.group].push(m)
  }
  return Object.entries(map)
})

/** FancySelect 用的模型列表（含分组标题） */
const modelSelectItems = computed(() => {
  const items = []
  for (const [gName, group] of modelGroups.value) {
    items.push({ type: 'group', label: gName })
    for (const m of group) items.push({ value: m.id, label: m.displayName || m.name || m.id })
  }
  return items
})

/** 功能模式 ID 常量，避免散落的魔法字符串 */
const MODE = {
  CHAT: 'chat',
}

// 国际化翻译函数
const { t } = useI18n()
// 全局模态弹窗（alert/confirm）
const { alert, confirm, prompt } = useModal()

// ===== 会话状态 =====

const route = useRoute()
const router = useRouter()

/**
 * 多会话（ChatGPT 风格）
 * - sessions: 会话列表（含 title + messages）
 * - activeSessionId: 当前激活会话
 *
 * URL 联动：
 * - 聊天页地址：/#/<sessionId>
 * - 切换会话时同步更新 hash
 * - 直接打开带 sessionId 的 URL 时自动切换到该会话
 *
 * 缓存策略：localStorage 持久化
 */
const SESSIONS_KEY = 'ai-chat-cache.sessions'

const sessions = ref(storage.get(SESSIONS_KEY, [])) // Array<{id, title, createdAt, messages:[] }>
const activeSessionId = ref(storage.get('ai-chat-cache.activeSessionId', ''))

const ensureSessions = () => {
  if (!Array.isArray(sessions.value)) sessions.value = []

  // 1) 优先使用 URL 里的 sessionId（/#/<sessionId>）
  const routeSid = typeof route.params.sessionId === 'string' ? route.params.sessionId : ''

  // 2) 没有会话则创建一个
  if (!sessions.value.length) {
    const id = routeSid || crypto?.randomUUID?.() || String(Date.now())
    sessions.value.push({ id, title: '新对话', createdAt: Date.now(), messages: [] })
    activeSessionId.value = id
  }

  // 3) 若 URL 指定的会话不存在，则创建该会话（便于分享链接/深链）
  if (routeSid && !sessions.value.some(s => s.id === routeSid)) {
    sessions.value.unshift({ id: routeSid, title: '新对话', createdAt: Date.now(), messages: [] })
  }

  // 4) activeSessionId 合法性兜底
  if (!activeSessionId.value || !sessions.value.some(s => s.id === activeSessionId.value)) {
    activeSessionId.value = routeSid || sessions.value[0].id
  }

  // 5) 若 URL 和当前会话不一致，主动同步 URL
  if ((routeSid || '') !== (activeSessionId.value || '')) {
    router.replace({ name: 'chat', params: { sessionId: activeSessionId.value } })
  }
}
ensureSessions()

const activeSession = computed(() => sessions.value.find(s => s.id === activeSessionId.value))

/**
 * 生成会话标题（自动总结）
 * - 第一次用户发言后生成标题（避免空标题）
 * - 模型：优先使用当前选择模型；温度固定 0
 */
const generateSessionTitle = async () => {
  if (!activeSession.value) return
  if (activeSession.value.title && activeSession.value.title !== '新对话') return

  // 取前几条内容拼一段上下文用于总结标题
  const sample = (activeSession.value.messages || [])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(0, 6)
    .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
    .join('\n')

  if (!sample.trim()) return

  const model = selectedModel.value || settings.defaultModel
  if (!model) return

  let title = ''
  try {
    await sendChatMessage({
      messages: [
        { role: 'system', content: '你是一个“会话标题生成器”。只输出一个简短标题（不超过12个字或20个英文字符），不要引号，不要句号。' },
        { role: 'user', content: `为下面对话生成标题：\n${sample}` },
      ],
      model,
      temperature: 0,
      onChunk: (c) => { title += c },
    })
    title = title.trim().replace(/^"|"$/g, '').slice(0, 30)
    if (title) activeSession.value.title = title
  } catch {
    // 标题生成失败不影响主流程
  }
}

/** 当前功能模式：仅保留 chat */
const currentMode = ref(MODE.CHAT)

/** 侧边栏是否打开 */
const sidebarOpen = ref(false)

/** 当前选中的模型 ID（优先使用，会回退到 settings.defaultModel） */
const selectedModel = ref(settings.defaultModel || '')

/**
 * 聊天消息列表（每条格式：{ role, content, image? }）
 * 需求：离开对话页去设置页再回来，消息不能丢。
 * 方案：将 messages 持久化到 localStorage（同域名下）。
 */
// 当前会话的消息列表（从 activeSession 派生出来），用于绑定到 ChatView
const messages = computed({
  get: () => activeSession.value?.messages || [],
  set: (v) => {
    if (activeSession.value) activeSession.value.messages = v
  }
})

/** 用户输入框内容（多视图共用同一变量） */
const userInput = ref('')

/** 是否正在等待 API 响应 */
const isLoading = ref(false)

/** ChatView 子组件引用，用于调用 scrollToBottom / focusInput / resetInputHeight */
const chatViewRef = ref(null)

/**
 * 聚焦输入框的统一入口
 * 说明：部分移动端浏览器会限制“非用户手势触发”的 focus，这里尽力而为。
 */
const focusChatInput = async () => {
  await nextTick()
  chatViewRef.value?.focusInput()
}

// 页面首次进入时自动聚焦输入框（移动端/部分浏览器可能因策略限制而不生效）
onMounted(async () => {
  // 首次进入：滚到底（若有缓存消息）+ 聚焦
  await nextTick()
  chatViewRef.value?.scrollToBottom()
  focusChatInput()
})

// 将对话消息持久化到 localStorage（用于“从设置页返回后不丢对话”）
watch(sessions, (v) => {
  // 只缓存 role/content（避免膨胀）
  const slimSessions = (v || []).map(s => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    messages: (s.messages || []).map(m => ({ role: m.role, content: m.content })),
  }))
  storage.set(SESSIONS_KEY, slimSessions)
  storage.set('ai-chat-cache.activeSessionId', activeSessionId.value)
}, { deep: true })

// 监听 URL 变化：用户手动改地址 / 通过分享链接进入时，自动切换会话
watch(() => route.params.sessionId, (sid) => {
  if (typeof sid !== 'string' || !sid) return
  if (sid === activeSessionId.value) return
  // 若不存在则创建
  if (!sessions.value.some(s => s.id === sid)) {
    sessions.value.unshift({ id: sid, title: '新对话', createdAt: Date.now(), messages: [] })
  }
  // 路由切换触发的会话切换：也要滚到底
  selectSession(sid)
})

/** 当前流式请求的 AbortController，用于中断请求 */
let abortController = null

/**
 * 停止生成（中断当前流式请求）
 */
const stopGenerating = () => {
  abortController?.abort()
}

/**
 * 重新回答：删除最后一条 assistant（如果存在），用最后一条 user 重新发一次
 */
const regenerateLast = async () => {
  if (isLoading.value) return

  // 找到最后一条 user 消息（重新生成“它”的回答）
  const roles = messages.value.map(m => m.role)
  const lastUserIdx = roles.lastIndexOf('user')
  if (lastUserIdx === -1) return

  const lastUser = messages.value[lastUserIdx]

  // 移除 user 后面已有的 assistant（旧回答/错误提示/空占位），避免残留
  while (messages.value.length - 1 > lastUserIdx && messages.value[messages.value.length - 1]?.role === 'assistant') {
    messages.value.pop()
  }

  const model = selectedModel.value || settings.defaultModel
  if (!model) {
    await alert({ icon: '⚙️', title: '未选择模型', message: '请先在设置页检测模型，或手动输入模型 ID', showCancel: false })
    return
  }
  if (!settings.apiBaseUrl) {
    await alert({ icon: '⚙️', title: '未配置 API', message: '请先在设置页填写 API 地址和密钥', showCancel: false })
    return
  }

  isLoading.value = true
  chatViewRef.value?.scrollToBottom()

  // 构建发送给 API 的历史消息数组（不重复追加 user 气泡）
  const history = []
  const sysPrompt = settings.systemPrompt
  if (sysPrompt) history.push({ role: 'system', content: sysPrompt })

  // 取最后一条 user 之前的上下文
  const ctxMsgs = messages.value.slice(0, lastUserIdx).slice(-settings.contextLength)
  for (const m of ctxMsgs) history.push({ role: m.role, content: m.content })
  history.push({ role: 'user', content: lastUser.content })

  // 追加新的 assistant 占位，流式输出填充
  messages.value.push({ role: 'assistant', content: '' })
  abortController = new AbortController()

  try {
    await sendChatMessage({
      messages: history,
      model,
      temperature: settings.temperature,
      signal: abortController.signal,
      onChunk: (chunk) => {
        messages.value[messages.value.length - 1].content += chunk
        chatViewRef.value?.scrollToBottom()
      },
    })
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


/**
 * computed：当前模式的显示标签
 * 从 CHAT_MODES 配置中根据 currentMode.id 查找对应 label
 */
const currentModeLabel = computed(() => CHAT_MODES.find(m => m.id === currentMode.value)?.label || '')

/**
 * 开始新对话：清空消息列表、输入内容、附件，并中断正在进行的流式请求
 */
const selectSession = async (id) => {
  activeSessionId.value = id

  // 会话 ↔ URL 联动：切换会话时同步更新地址（/#/<sessionId>）
  if (route.params.sessionId !== id) {
    router.replace({ name: 'chat', params: { sessionId: id } })
  }

  userInput.value = ''
  abortController?.abort()

  // 切换会话后：自动滚到底 + 聚焦（用户下一步大概率继续输入）
  if (currentMode.value === MODE.CHAT) {
    await nextTick()
    chatViewRef.value?.scrollToBottom()
    await focusChatInput()
  }
}

const createNewSession = async () => {
  const id = crypto?.randomUUID?.() || String(Date.now())
  sessions.value.unshift({ id, title: '新对话', createdAt: Date.now(), messages: [] })
  await selectSession(id)

  // 新建会话后强制滚到底 + 聚焦（明确的“开始输入”意图）
  if (currentMode.value === MODE.CHAT) {
    await nextTick()
    chatViewRef.value?.scrollToBottom()
    await focusChatInput()
  }
}

/**
 * 删除会话
 * - 删除当前会话时：自动切换到下一个会话；若没有会话则新建一个空会话
 */
const renameSession = async (id) => {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return

  const name = await prompt({
    icon: '✎',
    title: '重命名对话',
    message: '请输入新的对话标题',
    inputValue: s.title || '',
    inputPlaceholder: '例如：洛必达法则解释',
    inputMaxLength: 30,
    confirmText: '保存',
    cancelText: '取消',
  })
  if (name === null) return

  const v = String(name).trim().slice(0, 30)
  if (!v) return
  s.title = v
}

const deleteSession = async (id) => {
  const s = sessions.value.find(x => x.id === id)
  if (!s) return

  const ok = await confirm({
    icon: '🗑',
    title: '删除对话',
    message: `确定删除「${s.title || '新对话'}」吗？此操作不可恢复。`,
  })
  if (!ok) return

  const idx = sessions.value.findIndex(x => x.id === id)
  if (idx === -1) return
  sessions.value.splice(idx, 1)

  if (activeSessionId.value === id) {
    if (sessions.value.length) {
      activeSessionId.value = sessions.value[0].id
    } else {
      createNewSession()
    }
  }
}

/**
 * 删除当前会话的所有消息（“清空对话”）
 * 注意：这不会删除会话本身，只清空消息内容。
 */
const newChat = async () => {
  if (!activeSession.value) return
  activeSession.value.messages = []
  userInput.value = ''
  abortController?.abort()

  // 清空当前会话后自动聚焦（用户下一步大概率继续输入）
  if (currentMode.value === MODE.CHAT) {
    await focusChatInput()
  }
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

  userInput.value = ''            // 清空输入框
  chatViewRef.value?.resetInputHeight() // 重置输入框高度

  // 将用户消息推入消息列表
  const userMsg = { role: 'user', content: text }
  messages.value.push(userMsg)

  // 若当前会话还是默认标题，尽早生成一个（不阻塞主对话）
  if (activeSession.value?.title === '新对话') {
    generateSessionTitle()
  }

  isLoading.value = true
  chatViewRef.value?.scrollToBottom() // 滚动到最新消息

  // 构建发送给 API 的历史消息数组
  const history = []
  const sysPrompt = settings.systemPrompt
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

  } catch (e) {
    if (e.name !== 'AbortError') {
      // 非用户主动中断时，在消息中显示错误信息
      messages.value[messages.value.length - 1].content = `❌ ${e.message}`
    }
  } finally {
    isLoading.value = false
    chatViewRef.value?.scrollToBottom()
    // 发送完成后自动聚焦：用户下一步很可能继续追问
    await focusChatInput()
  }
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

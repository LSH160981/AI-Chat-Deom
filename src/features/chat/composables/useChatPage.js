/**
 * @file src/features/chat/composables/useChatPage.js
 * @description ChatPage 的业务逻辑层（会话管理 + 流式聊天）。
 *
 * 设计目标：
 * - ChatPage.vue 只负责“页面结构/组件组织”；
 * - 逻辑全部集中在此 composable，便于维护与单元测试。
 */

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { settings } from '@/stores/settings'
import { storage } from '@/utils/storage'
import { useModal } from '@/composables/useModal'
import { sendChatMessage } from '@/services/api'

const SESSIONS_KEY = 'ai-chat-cache.sessions'
const ACTIVE_ID_KEY = 'ai-chat-cache.activeSessionId'

/**
 * 把 detectedModels 按 group 分组，供 FancySelect 渲染。
 * @returns {import('vue').ComputedRef<Array<[string, any[]]>>}
 */
function useModelGroups() {
  const modelGroups = computed(() => {
    const map = {}
    for (const m of (settings.detectedModels || [])) {
      if (!map[m.group]) map[m.group] = []
      map[m.group].push(m)
    }
    return Object.entries(map)
  })

  const modelSelectItems = computed(() => {
    const items = []
    for (const [gName, group] of modelGroups.value) {
      items.push({ type: 'group', label: gName })
      for (const m of group) items.push({ value: m.id, label: m.displayName || m.name || m.id })
    }
    return items
  })

  return { modelGroups, modelSelectItems }
}

/**
 * useChatPage
 * @returns {object}
 */
export function useChatPage() {
  const route = useRoute()
  const router = useRouter()

  const { alert, confirm, prompt } = useModal()

  // UI
  const sidebarOpen = ref(false)
  const selectedModel = ref(settings.defaultModel || '')

  // sessions
  const sessions = ref(storage.get(SESSIONS_KEY, []))
  const activeSessionId = ref(storage.get(ACTIVE_ID_KEY, ''))

  const ensureSessions = () => {
    if (!Array.isArray(sessions.value)) sessions.value = []

    const routeSid = typeof route.params.sessionId === 'string' ? route.params.sessionId : ''

    if (!sessions.value.length) {
      const id = routeSid || crypto?.randomUUID?.() || String(Date.now())
      sessions.value.push({ id, title: '新对话', createdAt: Date.now(), messages: [] })
      activeSessionId.value = id
    }

    if (routeSid && !sessions.value.some(s => s.id === routeSid)) {
      sessions.value.unshift({ id: routeSid, title: '新对话', createdAt: Date.now(), messages: [] })
    }

    if (!activeSessionId.value || !sessions.value.some(s => s.id === activeSessionId.value)) {
      activeSessionId.value = routeSid || sessions.value[0].id
    }

    if ((routeSid || '') !== (activeSessionId.value || '')) {
      router.replace({ name: 'chat', params: { sessionId: activeSessionId.value } })
    }
  }
  ensureSessions()

  const activeSession = computed(() => sessions.value.find(s => s.id === activeSessionId.value))

  // bind messages to current session
  const messages = computed({
    get: () => activeSession.value?.messages || [],
    set: (v) => { if (activeSession.value) activeSession.value.messages = v },
  })

  const userInput = ref('')
  const isLoading = ref(false)
  const chatViewRef = ref(null)

  const focusChatInput = async () => {
    await nextTick()
    chatViewRef.value?.focusInput()
  }

  onMounted(async () => {
    await nextTick()
    chatViewRef.value?.scrollToBottom()
    focusChatInput()
  })

  // persist sessions (slim)
  watch(sessions, (v) => {
    const slimSessions = (v || []).map(s => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      messages: (s.messages || []).map(m => ({ role: m.role, content: m.content })),
    }))
    storage.set(SESSIONS_KEY, slimSessions)
    storage.set(ACTIVE_ID_KEY, activeSessionId.value)
  }, { deep: true })

  // route -> session
  watch(() => route.params.sessionId, (sid) => {
    if (typeof sid !== 'string' || !sid) return
    if (sid === activeSessionId.value) return
    if (!sessions.value.some(s => s.id === sid)) {
      sessions.value.unshift({ id: sid, title: '新对话', createdAt: Date.now(), messages: [] })
    }
    selectSession(sid)
  })

  // streaming cancel
  let abortController = null
  const stopGenerating = () => { abortController?.abort() }

  const generateSessionTitle = async () => {
    if (!activeSession.value) return
    if (activeSession.value.title && activeSession.value.title !== '新对话') return

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
      // ignore
    }
  }

  const selectSession = async (id) => {
    activeSessionId.value = id
    if (route.params.sessionId !== id) {
      router.replace({ name: 'chat', params: { sessionId: id } })
    }

    userInput.value = ''
    abortController?.abort()

    await nextTick()
    chatViewRef.value?.scrollToBottom()
    await focusChatInput()
  }

  const createNewSession = async () => {
    const id = crypto?.randomUUID?.() || String(Date.now())
    sessions.value.unshift({ id, title: '新对话', createdAt: Date.now(), messages: [] })
    await selectSession(id)

    await nextTick()
    chatViewRef.value?.scrollToBottom()
    await focusChatInput()
  }

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

  const newChat = async () => {
    if (!activeSession.value) return
    activeSession.value.messages = []
    userInput.value = ''
    abortController?.abort()
    await focusChatInput()
  }

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

    userInput.value = ''
    chatViewRef.value?.resetInputHeight()

    messages.value.push({ role: 'user', content: text })

    if (activeSession.value?.title === '新对话') {
      generateSessionTitle()
    }

    isLoading.value = true
    chatViewRef.value?.scrollToBottom()

    const history = []
    const sysPrompt = settings.systemPrompt
    if (sysPrompt) history.push({ role: 'system', content: sysPrompt })

    const ctxMsgs = messages.value.slice(0, -1).slice(-settings.contextLength)
    for (const m of ctxMsgs) history.push({ role: m.role, content: m.content })
    history.push({ role: 'user', content: text })

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
      await focusChatInput()
    }
  }

  const regenerateLast = async () => {
    if (isLoading.value) return

    const roles = messages.value.map(m => m.role)
    const lastUserIdx = roles.lastIndexOf('user')
    if (lastUserIdx === -1) return

    const lastUser = messages.value[lastUserIdx]

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

    const history = []
    const sysPrompt = settings.systemPrompt
    if (sysPrompt) history.push({ role: 'system', content: sysPrompt })

    const ctxMsgs = messages.value.slice(0, lastUserIdx).slice(-settings.contextLength)
    for (const m of ctxMsgs) history.push({ role: m.role, content: m.content })
    history.push({ role: 'user', content: lastUser.content })

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

  const { modelGroups, modelSelectItems } = useModelGroups()

  return {
    // ui
    sidebarOpen,
    selectedModel,

    // models
    modelGroups,
    modelSelectItems,

    // sessions
    sessions,
    activeSessionId,
    selectSession,
    renameSession,
    deleteSession,
    createNewSession,

    // chat
    messages,
    userInput,
    isLoading,
    chatViewRef,
    focusChatInput,
    sendMessage,
    stopGenerating,
    regenerateLast,
    newChat,
  }
}

<template>
  <div class="chat-app">
    <!-- 消息区域 -->
    <div ref="messagesEl" class="messages-area">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">✦</div>
        <h2>有什么可以帮你的？</h2>
        <p>开始一段对话吧</p>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-list">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="message-row"
          :class="msg.role"
        >
          <!-- AI 头像 -->
          <div v-if="msg.role === 'assistant'" class="avatar ai-avatar">✦</div>

          <!-- 消息内容 -->
          <div class="message-content" :class="msg.role">
            <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderContent(msg.content)"></div>
            <div v-else class="user-text">{{ msg.content }}</div>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="message-row assistant">
          <div class="avatar ai-avatar">✦</div>
          <div class="message-content assistant">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-wrapper" :class="{ focused: isFocused }">
        <textarea
          ref="inputEl"
          v-model="userInput"
          @keydown.enter.exact.prevent="sendMessage"
          @focus="isFocused = true"
          @blur="isFocused = false"
          placeholder="给 AI 发消息..."
          rows="1"
          :disabled="isLoading"
          class="input-textarea"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="!userInput.trim() || isLoading"
          class="send-btn"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L8 15M8 1L3 6M8 1L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <p class="disclaimer">AI 生成内容可能存在错误，请核实重要信息</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
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

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('sql', sql)

const userInput = ref('')
const messages = ref([])
const isLoading = ref(false)
const isFocused = ref(false)
const inputEl = ref(null)
const messagesEl = ref(null)
let puter = null

const MODEL = 'gpt-5-nano'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    let highlighted = escaped
    if (lang && hljs.getLanguage(lang)) {
      try { highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value } catch {}
    }
    return `<div class="code-block">
      <div class="code-header"><span class="lang-label">${lang || 'text'}</span><button class="copy-btn" onclick="copyCode(this)">复制</button></div>
      <pre class="hljs"><code>${highlighted}</code></pre>
    </div>`
  }
})

const renderContent = (content) => {
  if (!content) return ''
  try {
    content = content.replace(/\$\$([^$]+)\$\$/g, (_, tex) => {
      try { return katex.renderToString(tex, { throwOnError: false, displayMode: true }) } catch { return _ }
    })
    content = content.replace(/\$([^$\n]+)\$/g, (_, tex) => {
      try { return katex.renderToString(tex, { throwOnError: false, displayMode: false }) } catch { return _ }
    })
    return md.render(content)
  } catch { return content }
}

window.copyCode = async (btn) => {
  const code = btn.closest('.code-block').querySelector('code').textContent
  try {
    await navigator.clipboard.writeText(code)
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = '复制' }, 2000)
  } catch { btn.textContent = '失败' }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

onMounted(() => {
  const s = document.createElement('script')
  s.src = 'https://js.puter.com/v2/'
  s.onload = () => {
    puter = window.puter
    nextTick(() => inputEl.value?.focus())
  }
  document.head.appendChild(s)
})

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value || !puter) return
  const text = userInput.value.trim()
  userInput.value = ''
  messages.value.push({ role: 'user', content: text })
  isLoading.value = true
  scrollToBottom()

  try {
    const history = messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: text })
    const response = await puter.ai.chat(history, { model: MODEL, stream: true })
    messages.value.push({ role: 'assistant', content: '' })
    let full = ''
    for await (const part of response) {
      if (part?.text) {
        full += part.text
        messages.value[messages.value.length - 1].content = full
        scrollToBottom()
      }
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: `出错了：${e.message}` })
  } finally {
    isLoading.value = false
    scrollToBottom()
    nextTick(() => inputEl.value?.focus())
  }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
  color: #1a1a1a;
}

.chat-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 760px;
  margin: 0 auto;
}

/* 消息区域 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px 20px;
  scroll-behavior: smooth;
}

.messages-area::-webkit-scrollbar { width: 5px; }
.messages-area::-webkit-scrollbar-track { background: transparent; }
.messages-area::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #999;
  gap: 10px;
}

.empty-icon {
  font-size: 36px;
  color: #ccc;
  margin-bottom: 8px;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.empty-state p {
  font-size: 14px;
}

/* 消息列表 */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-row.user {
  flex-direction: row-reverse;
}

/* 头像 */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ai-avatar {
  background: #f0f0f0;
  color: #555;
  font-size: 16px;
}

/* 消息内容 */
.message-content {
  max-width: 85%;
  line-height: 1.65;
  font-size: 15px;
}

.message-content.assistant {
  color: #1a1a1a;
}

.user-text {
  background: #f4f4f4;
  padding: 10px 14px;
  border-radius: 14px 14px 4px 14px;
  color: #1a1a1a;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 打字动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 14px 0;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  background: #bbb;
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-6px); opacity: 1; }
}

/* 输入区域 */
.input-area {
  padding: 12px 20px 20px;
  background: #fff;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border: 1.5px solid #e0e0e0;
  border-radius: 14px;
  padding: 10px 10px 10px 14px;
  transition: border-color 0.2s;
  background: #fff;
}

.input-wrapper.focused {
  border-color: #aaa;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;
  max-height: 160px;
  background: transparent;
  color: #1a1a1a;
}

.input-textarea::placeholder { color: #bbb; }

.send-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: #1a1a1a;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, opacity 0.2s;
}

.send-btn:disabled {
  background: #e0e0e0;
  color: #aaa;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover { background: #333; }

.disclaimer {
  text-align: center;
  color: #bbb;
  font-size: 11px;
  margin-top: 8px;
}

/* Markdown */
.markdown-body { font-size: 15px; line-height: 1.7; }
.markdown-body p { margin-bottom: 12px; }
.markdown-body p:last-child { margin-bottom: 0; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 { margin: 18px 0 10px; font-weight: 600; }
.markdown-body h1 { font-size: 1.4em; }
.markdown-body h2 { font-size: 1.2em; }
.markdown-body h3 { font-size: 1.05em; }
.markdown-body ul, .markdown-body ol { padding-left: 22px; margin-bottom: 12px; }
.markdown-body li { margin-bottom: 4px; }
.markdown-body code {
  background: #f3f3f3;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Menlo', 'Consolas', monospace;
  color: #d14;
}
.markdown-body blockquote {
  border-left: 3px solid #ddd;
  padding: 4px 12px;
  margin: 10px 0;
  color: #777;
}
.markdown-body a { color: #0066cc; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body table { border-collapse: collapse; width: 100%; margin: 12px 0; }
.markdown-body th, .markdown-body td { border: 1px solid #e5e5e5; padding: 7px 12px; text-align: left; font-size: 14px; }
.markdown-body th { background: #f8f8f8; font-weight: 600; }
.markdown-body hr { border: none; border-top: 1px solid #ebebeb; margin: 16px 0; }

/* 代码块 */
.code-block { border-radius: 10px; overflow: hidden; margin: 12px 0; background: #0d1117; }
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #161b22;
}
.lang-label { font-size: 12px; color: #8b949e; font-family: monospace; }
.copy-btn {
  font-size: 12px;
  color: #8b949e;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
}
.copy-btn:hover { color: #fff; }
.hljs { padding: 14px !important; margin: 0 !important; border-radius: 0 !important; font-size: 13px; }
pre.hljs code { background: transparent; padding: 0; color: inherit; }

/* KaTeX */
.katex { font-size: 1.05em; }
.katex-display { margin: 14px 0; overflow-x: auto; }

/* 移动端 */
@media (max-width: 640px) {
  .chat-app { max-width: 100%; }
  .messages-area { padding: 20px 14px 10px; }
  .input-area { padding: 8px 14px 16px; }
  .message-content { max-width: 92%; }
}
</style>

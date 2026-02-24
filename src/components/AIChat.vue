<template>
  <div class="h-screen flex flex-col" style="background-color: #e5e5e5;">
    <!-- 对话区域 -->
    <div class="flex-1 overflow-hidden">
      <div class="h-full mx-auto chat-container">
        <div ref="chatContainer" class="h-full overflow-y-auto py-4 px-3">
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
            <h2 class="text-xl" style="color: #666;">有什么可以帮你的？</h2>
          </div>
          
          <div v-else style="display: flex; flex-direction: column; gap: 12px; padding: 5px 0;">
            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              style="display: flex; align-items: flex-start;"
              :style="msg.role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'"
            >
              <!-- AI头像 -->
              <div 
                v-if="msg.role === 'assistant'"
                style="width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #22c55e; order: 1;"
              >
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              
              <!-- 消息内容 -->
              <div 
                style="padding: 6px 12px; font-size: 14px; border-radius: 5px; max-width: 85%;"
                :style="msg.role === 'user' ? 'background: #93c5fd; color: #1f2937; order: 2;' : 'background: #86efac; color: #1f2937; order: 2; margin-left: 8px;'"
              >
                <div class="markdown-body" v-html="renderContent(msg.content)"></div>
              </div>

              <!-- 用户头像 -->
              <div 
                v-if="msg.role === 'user'"
                style="width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #3b82f6; order: 3;"
              >
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            
            <!-- 加载状态 -->
            <div v-if="isLoading" style="display: flex; gap: 8px; align-items: center;">
              <div style="width: 24px; height: 24px; border-radius: 9999px; background: #22c55e; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div style="display: flex; gap: 4px;">
                <span style="width: 6px; height: 6px; background: #999; border-radius: 9999px; animation: pulse 1s infinite;"></span>
                <span style="width: 6px; height: 6px; background: #999; border-radius: 9999px; animation: pulse 1s infinite; animation-delay: 0.15s;"></span>
                <span style="width: 6px; height: 6px; background: #999; border-radius: 9999px; animation: pulse 1s infinite; animation-delay: 0.3s;"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-container" style="padding: 5px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div 
          style="width: 80%; background: white; border-radius: 5px; border: 1px solid #e5e5e5;"
          :style="isFocused ? 'border-color: #93c5fd;' : ''"
        >
          <textarea
            ref="inputRef"
            v-model="userInput" 
            @keydown.enter.exact.prevent="sendMessage"
            @focus="isFocused = true"
            @blur="isFocused = false"
            placeholder=""
            rows="1"
            style="width: 100%; background: transparent; color: #1f2937; font-size: 14px; padding: 5px; resize: none; height: 45px; border: none; outline: none;"
            :disabled="isLoading"
          ></textarea>
        </div>
        
        <button 
          @click="sendMessage" 
          :disabled="!userInput.trim() || isLoading"
          style="width: 20%; height: 45px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: #3b82f6; color: white; border: none; cursor: pointer;"
          :style="!userInput.trim() || isLoading ? 'opacity: 0.5; cursor: not-allowed;' : ''"
        >
          发送
        </button>
      </div>
      <p style="text-align: center; color: #999; font-size: 10px; margin-top: 8px;">AI 生成内容可能存在错误，请核实重要信息</p>
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
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import katex from 'katex'

// 注册语言
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
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)

const userInput = ref('')
const messages = ref([])
const isLoading = ref(false)
const isFocused = ref(false)
const inputRef = ref(null)
const chatContainer = ref(null)
let puter = null

const MODEL = 'gpt-5-nano'

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    const escapedCode = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let highlighted;
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
      } catch (__) {
        highlighted = escapedCode;
      }
    } else {
      highlighted = escapedCode;
    }
    return `<div class="code-wrapper">
      <button class="copy-btn" onclick="copyCode(this, '${lang || 'text'}')">复制</button>
      <pre class="hljs"><code class="language-${lang || 'text'}">${highlighted}</code></pre>
    </div>`;
  }
})

// 渲染数学公式和Markdown
const renderContent = (content) => {
  if (!content) return ''
  
  try {
    // 先渲染数学公式 (行内公式 $...$)
    content = content.replace(/\$([^$\n]+)\$/g, (match, tex) => {
      try {
        return katex.renderToString(tex, { throwOnError: false, displayMode: false })
      } catch (e) {
        return match
      }
    })
    
    // 渲染块级公式 $$...$$
    content = content.replace(/\$\$([^$]+)\$\$/g, (match, tex) => {
      try {
        return katex.renderToString(tex, { throwOnError: false, displayMode: true })
      } catch (e) {
        return match
      }
    })
    
    // 再渲染 Markdown
    return md.render(content)
  } catch (e) {
    console.error('Render error:', e)
    return content
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 全局复制函数（供代码块按钮使用）
window.copyCode = async (btn, lang) => {
  const wrapper = btn.closest('.code-wrapper')
  const code = wrapper.querySelector('code').textContent
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      // 备用方案
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    btn.textContent = '已复制'
    btn.style.background = '#22c55e'
    setTimeout(() => {
      btn.textContent = '复制'
      btn.style.background = ''
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    btn.textContent = '失败'
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://js.puter.com/v2/'
  script.onload = () => {
    puter = window.puter
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
  document.head.appendChild(script)
})

const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value || !puter) return
  
  const userMessage = userInput.value.trim()
  userInput.value = ''
  
  messages.value.push({ role: 'user', content: userMessage })
  isLoading.value = true
  
  scrollToBottom()
  
  try {
    // 构建对话历史（不包含刚添加的用户消息，因为那条消息正在发送中）
    const conversationHistory = messages.value
      .slice(0, -1)  // 排除最后一条（刚添加的用户消息）
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    
    // 添加当前用户消息
    conversationHistory.push({ role: 'user', content: userMessage })
    
    const response = await puter.ai.chat(conversationHistory, {
      model: MODEL,
      stream: true
    })
    
    messages.value.push({ role: 'assistant', content: '' })
    let fullResponse = ''
    
    for await (const part of response) {
      if (part?.text) {
        fullResponse += part.text
        messages.value[messages.value.length - 1].content = fullResponse
        scrollToBottom()
      }
    }
  } catch (error) {
    console.error('AI Error:', error)
    messages.value.push({ 
      role: 'assistant', 
      content: `抱歉，发生错误: ${error.message}` 
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';

html, body {
  overflow: hidden;
  margin: 0;
  padding: 0;
  height: 100%;
}

/* 桌面版 - 70% 宽度 */
.chat-container,
.input-container {
  width: 70%;
  max-width: 70%;
  margin: 0 auto;
}

/* 手机响应式 - 100% 宽度 */
@media (max-width: 768px) {
  .chat-container,
  .input-container {
    width: 100%;
    max-width: 100%;
  }
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Markdown 样式 */
.markdown-body {
  line-height: 1.6;
  font-size: 14px;
}

.markdown-body p {
  margin: 0 0 10px 0;
}

.markdown-body p:last-child {
  margin-bottom: 0;
}

.markdown-body h1, 
.markdown-body h2, 
.markdown-body h3, 
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin: 15px 0 10px 0;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body h1 { font-size: 1.5em; }
.markdown-body h2 { font-size: 1.3em; }
.markdown-body h3 { font-size: 1.15em; }

.markdown-body ul,
.markdown-body ol {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-body li {
  margin: 4px 0;
}

.markdown-body code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #e11d48;
}

.markdown-body pre {
  background: #1e293b;
  padding: 14px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.markdown-body pre code {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body blockquote {
  border-left: 4px solid #22c55e;
  margin: 10px 0;
  padding: 6px 12px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 0 4px 4px 0;
}

.markdown-body a {
  color: #3b82f6;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
}

.markdown-body th,
.markdown-body td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body th {
  background: #f1f5f9;
  font-weight: 600;
}

.markdown-body hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 15px 0;
}

.markdown-body img {
  max-width: 100%;
  border-radius: 6px;
  margin: 10px 0;
}

/* KaTeX 公式样式 */
.katex {
  font-size: 1.1em;
}

.katex-display {
  margin: 12px 0;
  overflow-x: auto;
}

/* highlight.js 样式覆盖 */
.hljs {
  background: #1e293b !important;
  padding: 0 !important;
  margin: 0 !important;
}

pre.hljs {
  padding: 12px !important;
  border-radius: 6px;
  overflow-x: auto;
}

pre.hljs code {
  background: transparent;
  padding: 0;
}

/* 代码块复制按钮 */
.code-wrapper {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 12px;
  background: rgba(255,255,255,0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255,255,255,0.2);
}
</style>

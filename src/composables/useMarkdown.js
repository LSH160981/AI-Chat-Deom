/**
 * @file useMarkdown.js
 * @description Markdown 渲染 Composable
 *
 * 功能概述：
 * - 使用 markdown-it 渲染 Markdown 文本为 HTML
 * - 集成 highlight.js 实现代码块语法高亮（支持 13 种主流语言）
 * - 集成 KaTeX 渲染数学公式（支持行内公式 $...$ 和块级公式 $$...$$）
 * - 代码块带有语言标签和一键复制按钮
 *
 * 使用方式：
 *   const { renderContent } = useMarkdown()
 *   const html = renderContent(markdownText)
 */
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'

// 按需引入各语言的高亮支持模块（减少打包体积）
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

// 语言映射表：将语言别名映射到对应的高亮语言模块
// 支持别名（如 js → javascript，html → xml，shell → bash）
const langMap = {
  javascript, python, css, xml, json, bash, typescript, java, c, cpp, go, rust, sql,
  js: javascript, html: xml, shell: bash, ts: typescript, py: python
}

// 批量注册所有语言到 highlight.js
Object.entries(langMap).forEach(([k, v]) => hljs.registerLanguage(k, v))

// 初始化 markdown-it 实例（全局复用，避免重复创建开销）
const md = new MarkdownIt({
  html: true,        // 允许在 Markdown 中嵌入 HTML
  linkify: true,     // 自动将 URL 文本转为可点击链接
  typographer: true, // 启用排版优化（智能引号、破折号等）
  /**
   * 代码块高亮回调函数
   *
   * 当 markdown-it 遇到代码块（```lang）时调用此函数。
   * 使用 highlight.js 对代码进行语法高亮，并包裹在带语言标签和复制按钮的 DOM 结构中。
   *
   * @param {string} str  - 代码块的原始内容
   * @param {string} lang - 代码块指定的语言标识（如 'javascript'）
   * @returns {string} 渲染后的 HTML 字符串
   */
  highlight(str, lang) {
    // 默认对特殊字符进行 HTML 转义，防止 XSS
    let highlighted = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (lang && hljs.getLanguage(lang)) {
      try {
        // 如果指定了语言且已注册，使用 highlight.js 进行语法高亮
        highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch {} // 高亮失败时静默降级为转义后的纯文本
    }
    // 返回带工具栏的代码块 HTML 结构
    return `<div class="code-block">
      <div class="code-header">
        <span class="lang-label">${lang || 'text'}</span>
        <button class="copy-btn" onclick="copyCode(this)">复制</button>
      </div>
      <pre class="hljs"><code>${highlighted}</code></pre>
    </div>`
  }
})

/**
 * 全局复制代码函数（挂载到 window，供代码块内联 onclick 调用）
 *
 * 点击代码块的"复制"按钮时触发，将对应代码块的文本内容复制到剪贴板。
 * 复制成功后按钮文字变为"已复制"，2秒后恢复为"复制"。
 *
 * @param {HTMLElement} btn - 被点击的复制按钮元素
 * @returns {Promise<void>}
 */
window.copyCode = async (btn) => {
  // 从按钮向上查找 .code-block 容器，再定位其中的 <code> 元素获取文本
  const code = btn.closest('.code-block').querySelector('code').textContent
  try {
    await navigator.clipboard.writeText(code) // 写入剪贴板
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = '复制' }, 2000) // 2秒后恢复按钮文字
  } catch {
    btn.textContent = '失败' // 剪贴板 API 不可用时（如非 HTTPS 环境）显示失败
  }
}

/**
 * Markdown 渲染 Composable
 *
 * @returns {{ renderContent: Function }}
 */
export function useMarkdown() {
  /**
   * 将 Markdown 文本渲染为 HTML
   *
   * 处理顺序：
   * 1. 先替换数学公式（KaTeX）：块级公式 $$...$$ → displayMode，行内公式 $...$ → inline
   * 2. 再用 markdown-it 渲染剩余的 Markdown 语法
   *
   * 注意：KaTeX 替换必须在 Markdown 渲染之前，否则 markdown-it 可能会破坏公式语法
   *
   * @param {string} content - 原始 Markdown 文本（可包含数学公式）
   * @returns {string} 渲染后的 HTML 字符串，输入为空时返回空字符串
   */
  const renderContent = (content) => {
    if (!content) return '' // 空内容直接返回，避免无效处理
    try {
      // 第一步：处理块级数学公式 $$...$$（跨行公式，如矩阵、方程组）
      content = content.replace(/\$\$([^$]+)\$\$/g, (_, tex) => {
        try {
          return katex.renderToString(tex, { throwOnError: false, displayMode: true }) // displayMode: 独立行显示
        } catch { return _ } // KaTeX 解析失败时保留原始公式文本
      })

      // 第二步：处理行内数学公式 $...$（单行公式，如变量、简单表达式）
      content = content.replace(/\$([^$\n]+)\$/g, (_, tex) => {
        try {
          return katex.renderToString(tex, { throwOnError: false }) // 默认为行内模式
        } catch { return _ } // KaTeX 解析失败时保留原始公式文本
      })

      // 第三步：将处理过公式的文本交给 markdown-it 渲染其余 Markdown 语法
      return md.render(content)
    } catch {
      return content // markdown-it 渲染异常时降级返回原始文本，避免页面白屏
    }
  }

  return { renderContent }
}

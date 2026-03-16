/**
 * Markdown 渲染 + highlight.js + KaTeX
 */
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

const langMap = {
  javascript, python, css, xml, json, bash, typescript, java, c, cpp, go, rust, sql,
  js: javascript, html: xml, shell: bash, ts: typescript, py: python
}
Object.entries(langMap).forEach(([k, v]) => hljs.registerLanguage(k, v))

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    let highlighted = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (lang && hljs.getLanguage(lang)) {
      try { highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value } catch {}
    }
    return `<div class="code-block">
      <div class="code-header">
        <span class="lang-label">${lang || 'text'}</span>
        <button class="copy-btn" onclick="copyCode(this)">复制</button>
      </div>
      <pre class="hljs"><code>${highlighted}</code></pre>
    </div>`
  }
})

// 全局复制函数（代码块按钮用）
window.copyCode = async (btn) => {
  const code = btn.closest('.code-block').querySelector('code').textContent
  try {
    await navigator.clipboard.writeText(code)
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = '复制' }, 2000)
  } catch {
    btn.textContent = '失败'
  }
}

export function useMarkdown() {
  const renderContent = (content) => {
    if (!content) return ''
    try {
      // KaTeX 数学公式
      content = content.replace(/\$\$([^$]+)\$\$/g, (_, tex) => {
        try { return katex.renderToString(tex, { throwOnError: false, displayMode: true }) } catch { return _ }
      })
      content = content.replace(/\$([^$\n]+)\$/g, (_, tex) => {
        try { return katex.renderToString(tex, { throwOnError: false }) } catch { return _ }
      })
      return md.render(content)
    } catch {
      return content
    }
  }

  return { renderContent }
}

<template>
  <div class="settings-page">
    <div class="settings-container">

      <!-- 页头 -->
      <div class="settings-header">
        <button class="back-btn" @click="$router.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {{ $t('common.back') }}
        </button>
        <h1>{{ $t('settings.title') }}</h1>
        <button class="reset-btn" @click="confirmReset">{{ $t('common.reset') }}</button>
      </div>

      <!-- API 连接 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🔌</span> API 连接</h2>

        <!-- 旧接口迁移提示 -->
        <div v-if="isOldApi" class="migrate-banner">
          <span>⚠️ 检测到旧接口（s2a.dgtw.de 已不可用）</span>
          <button class="migrate-btn" @click="migrateToOpenRouter">一键切换到 OpenRouter 免费接口</button>
        </div>

        <div class="setting-item col">
          <div class="setting-info">
            <label>Base URL</label>
            <p>服务商地址，会自动补全路径（如 /v1）</p>
          </div>
          <div class="url-row">
            <input
              v-model="settings.apiBaseUrl"
              class="s-input url-input"
              placeholder="https://api.openai.com"
              @blur="showNormalized"
            />
            <span v-if="normalizedUrl" class="url-hint">→ {{ normalizedUrl }}</span>
          </div>
        </div>

        <div class="setting-item col">
          <div class="setting-info">
            <label>API Key</label>
            <p>sk-... 或对应服务商的密钥</p>
          </div>
          <div class="key-row">
            <input
              v-model="settings.apiKey"
              :type="showKey ? 'text' : 'password'"
              class="s-input key-input"
              placeholder="sk-..."
              autocomplete="off"
            />
            <button class="eye-btn" @click="showKey = !showKey">
              {{ showKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <!-- 检测按钮 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>可用模型</label>
            <p v-if="settings.detectedModels.length">已检测到 {{ settings.detectedModels.length }} 个模型</p>
            <p v-else>点击检测获取模型列表</p>
          </div>
          <button class="detect-btn" :disabled="detecting || !settings.apiBaseUrl" @click="runDetect">
            <span v-if="detecting" class="detect-spin"></span>
            {{ detecting ? '检测中…' : '🔍 检测' }}
          </button>
        </div>

        <!-- 检测错误 -->
        <div v-if="detectError" class="detect-error">
          <span>⚠️ </span><span v-text="cleanError(detectError)"></span>
        </div>

        <!-- 测试连接 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>测试连接</label>
            <p>验证 URL / Key / 模型是否可用</p>
          </div>
          <button
            class="detect-btn"
            :class="testStatus === 'ok' ? 'test-ok' : testStatus === 'fail' ? 'test-fail' : ''"
            :disabled="testing || !settings.apiBaseUrl || !settings.defaultModel"
            @click="runTest"
          >
            <span v-if="testing" class="detect-spin"></span>
            <template v-else-if="testStatus === 'ok'">✅ 可用</template>
            <template v-else-if="testStatus === 'fail'">❌ 失败</template>
            <template v-else>🧪 测试</template>
          </button>
        </div>

        <!-- 测试结果详情 -->
        <div v-if="testResult" class="test-result" :class="testStatus">
          <div class="test-result-row">
            <span class="test-label">延迟</span>
            <span class="test-value">{{ testResult.latency }}ms</span>
          </div>
          <div class="test-result-row">
            <span class="test-label">模型</span>
            <span class="test-value mono">{{ testResult.model }}</span>
          </div>
          <div class="test-result-row">
            <span class="test-label">回复</span>
            <span class="test-value">{{ testResult.reply }}</span>
          </div>
        </div>
        <div v-if="testError" class="detect-error">
          ⚠️ <span v-text="cleanError(testError)"></span>
        </div>

        <!-- 模型列表（分组折叠展示） -->
        <div v-if="settings.detectedModels.length" class="model-list-preview">
          <div
            v-for="(group, gName) in groupedModels"
            :key="gName"
            class="model-group"
          >
            <div class="model-group-title" @click="toggleGroup(gName)">
              <span>{{ gName }} <em>({{ group.length }})</em></span>
              <span class="chevron">{{ openGroups[gName] ? '▲' : '▼' }}</span>
            </div>
            <div v-if="openGroups[gName]" class="model-group-items">
              <div
                v-for="m in group"
                :key="m.id"
                class="model-chip"
                :class="{ selected: settings.defaultModel === m.id }"
                @click="settings.defaultModel = m.id"
              >
                {{ m.name }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 默认模型（检测前用手动输入） -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">💬</span> {{ $t('settings.sectionChat') }}</h2>

        <div class="setting-item col">
          <div class="setting-info">
            <label>{{ $t('settings.defaultModel') }}</label>
            <p>{{ settings.detectedModels.length ? '从上方列表点击选择，或手动输入' : '填写模型 ID，如 gpt-4o / claude-sonnet-4-5' }}</p>
          </div>
          <input v-model="settings.defaultModel" class="s-input" placeholder="gpt-4o" />
        </div>

        <div class="setting-item col">
          <div class="setting-info">
            <label>{{ $t('settings.systemPrompt') }}</label>
            <p>{{ $t('settings.systemPromptHint') }}</p>
          </div>
          <textarea v-model="settings.systemPrompt" :placeholder="$t('settings.systemPromptPlaceholder')" class="s-textarea" rows="3"></textarea>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.temperature') }} <span class="value-badge">{{ settings.temperature }}</span></label>
            <p>{{ $t('settings.temperatureHint') }}</p>
          </div>
          <input type="range" v-model.number="settings.temperature" min="0" max="2" step="0.1" class="s-range" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.contextLength') }} <span class="value-badge">{{ settings.contextLength }} {{ $t('settings.contextLengthUnit') }}</span></label>
            <p>{{ $t('settings.contextLengthHint') }}</p>
          </div>
          <input type="range" v-model.number="settings.contextLength" min="2" max="50" step="2" class="s-range" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.sendOnEnter') }}</label>
            <p>{{ $t('settings.sendOnEnterHint') }}</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.sendOnEnter" />
            <span class="s-toggle-track"></span>
          </label>
        </div>
      </section>

      <!-- 语音 TTS -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🔊</span> {{ $t('settings.sectionTTS') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.autoRead') }}</label>
            <p>{{ $t('settings.autoReadHint') }}</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.ttsEnabled" />
            <span class="s-toggle-track"></span>
          </label>
        </div>

        <div class="setting-item col">
          <div class="setting-info">
            <label>TTS 模型 ID</label>
            <p>如 tts-1、tts-1-hd，留空使用默认</p>
          </div>
          <input v-model="settings.ttsModel" class="s-input" placeholder="tts-1" />
        </div>

        <div class="setting-item col">
          <div class="setting-info">
            <label>{{ $t('settings.ttsVoice') }}</label>
            <p>alloy / nova / echo / onyx / shimmer / coral</p>
          </div>
          <input v-model="settings.ttsVoice" class="s-input" placeholder="alloy" />
        </div>
      </section>

      <!-- 图片生成 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🎨</span> {{ $t('settings.sectionImage') }}</h2>

        <div class="setting-item col">
          <div class="setting-info">
            <label>图片模型 ID</label>
            <p>如 dall-e-3、gpt-image-1，需服务商支持</p>
          </div>
          <input v-model="settings.imageModel" class="s-input" placeholder="dall-e-3" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>尺寸</label>
          </div>
          <select v-model="settings.imageSize" class="s-select">
            <option value="256x256">256×256</option>
            <option value="512x512">512×512</option>
            <option value="1024x1024">1024×1024</option>
            <option value="1792x1024">1792×1024</option>
            <option value="1024x1792">1024×1792</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.imageQuality') }}</label>
          </div>
          <select v-model="settings.imageQuality" class="s-select">
            <option value="standard">Standard</option>
            <option value="hd">HD</option>
          </select>
        </div>
      </section>

      <!-- 外观 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">✨</span> {{ $t('settings.sectionAppearance') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.theme') }}</label>
          </div>
          <div class="theme-picker">
            <button v-for="t in themes" :key="t.value" class="theme-btn" :class="{ active: settings.theme === t.value }" @click="settings.theme = t.value">
              <span class="theme-preview" :style="t.style"></span>
              {{ $t(t.labelKey) }}
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.fontSize') }}</label>
          </div>
          <div class="size-picker">
            <button v-for="s in fontSizes" :key="s.value" class="size-btn" :class="[s.cls, { active: settings.fontSize === s.value }]" @click="settings.fontSize = s.value">A</button>
          </div>
        </div>
      </section>

      <!-- 语言 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🌐</span> {{ $t('settings.sectionLanguage') }}</h2>
        <div class="setting-item col">
          <div class="lang-picker">
            <button v-for="lang in LANGUAGES" :key="lang.code" class="lang-btn" :class="{ active: currentLocale === lang.code }" @click="switchLang(lang.code)">
              <span class="lang-flag">{{ lang.flag }}</span>
              <span class="lang-name">{{ lang.label }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 危险区 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">⚙️</span> {{ $t('settings.sectionAdvanced') }}</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label class="danger-label">{{ $t('settings.clearData') }}</label>
            <p>{{ $t('settings.clearDataHint') }}</p>
          </div>
          <button class="danger-btn" @click="clearData">{{ $t('settings.clearDataBtn') }}</button>
        </div>
      </section>

      <!-- 关于 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">ℹ️</span> {{ $t('settings.sectionAbout') }}</h2>
        <div class="about-card">
          <div class="about-logo">✦</div>
          <div class="about-info">
            <h3>AI Chat</h3>
            <p>{{ $t('settings.aboutDesc') }}</p>
            <p class="about-links">
              <a href="https://github.com/LSH160981/AI-Chat-Deom" target="_blank">GitHub</a>
            </p>
          </div>
        </div>
      </section>

      <div class="save-notice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {{ $t('common.autoSaved') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { settings, resetSettings } from '@/stores/settings'
import { LANGUAGES } from '@/i18n'
import { useModal } from '@/composables/useModal'
import { useModelDetector } from '@/composables/useModelDetector'
import { normalizeBaseUrl } from '@/composables/useApiClient'

const { t, locale } = useI18n()
const currentLocale = computed(() => locale.value)
const { confirm } = useModal()
const { detect, detecting, error: detectError } = useModelDetector()
import { chatStream } from '@/composables/useApiClient'

// 测试连接
const testing = ref(false)
const testStatus = ref('') // '' | 'ok' | 'fail'
const testResult = ref(null)
const testError = ref('')

// 清理错误信息：去掉 HTML 标签，截短到 120 字符
const cleanError = (msg) => {
  if (!msg) return ''
  const text = String(msg).replace(/<[^>]*>/g, '').trim()
  if (text.includes('Just a moment') || text.includes('challenge') || text.includes('Cloudflare')) {
    return '该接口需要浏览器验证（Cloudflare 拦截），请直接在浏览器中访问后再试，或更换其他接口'
  }
  return text.slice(0, 120)
}

const runTest = async () => {
  testing.value = true
  testStatus.value = ''
  testResult.value = null
  testError.value = ''
  const model = settings.defaultModel
  const t0 = Date.now()
  let reply = ''
  try {
    await chatStream({
      messages: [{ role: 'user', content: 'Hi, reply with exactly one word: OK' }],
      model,
      temperature: 0,
      onChunk: (c) => { reply += c },
    })
    testStatus.value = 'ok'
    testResult.value = {
      latency: Date.now() - t0,
      model,
      reply: reply.trim().slice(0, 80),
    }
  } catch (e) {
    testStatus.value = 'fail'
    testError.value = e.message || String(e)
  } finally {
    testing.value = false
  }
}

// 设置页滚动解锁
onMounted(() => {
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
})
onUnmounted(() => {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

// URL 补全预览
const normalizedUrl = ref('')
const showNormalized = () => {
  const n = normalizeBaseUrl(settings.apiBaseUrl)
  normalizedUrl.value = (n && n !== settings.apiBaseUrl) ? n : ''
}

// 旧接口迁移
const isOldApi = computed(() => settings.apiBaseUrl?.includes('s2a.dgtw.de'))
const migrateToOpenRouter = () => {
  settings.apiBaseUrl = 'https://openrouter.ai'
  settings.apiKey = ''
  settings.defaultModel = 'meta-llama/llama-3.3-70b-instruct:free'
  settings.detectedModels = []
  normalizedUrl.value = ''
}

// API Key 显隐
const showKey = ref(false)

// 模型检测
const openGroups = ref({})
const groupedModels = computed(() => {
  const map = {}
  for (const m of settings.detectedModels) {
    if (!map[m.group]) map[m.group] = []
    map[m.group].push(m)
  }
  return map
})
const toggleGroup = (name) => {
  openGroups.value[name] = !openGroups.value[name]
}

const runDetect = async () => {
  const models = await detect(settings.apiBaseUrl, settings.apiKey)
  if (models.length) {
    settings.detectedModels = models
    // 默认展开第一组
    const first = models[0]?.group
    if (first) openGroups.value[first] = true
    // 如果当前没选模型，自动选第一个
    if (!settings.defaultModel && models[0]) {
      settings.defaultModel = models[0].id
    }
  }
}

// 语言切换
const switchLang = (code) => {
  locale.value = code
  localStorage.setItem('ai-chat-lang', code)
}

const themes = [
  { value: 'light',  labelKey: 'settings.themeLight',  style: 'background:#fff;border:1px solid #ddd;' },
  { value: 'dark',   labelKey: 'settings.themeDark',   style: 'background:#1a1a1a;' },
  { value: 'system', labelKey: 'settings.themeSystem', style: 'background:linear-gradient(135deg,#fff 50%,#1a1a1a 50%);border:1px solid #ddd;' },
]

const fontSizes = [
  { value: 'sm', cls: 'fs-sm' },
  { value: 'md', cls: 'fs-md' },
  { value: 'lg', cls: 'fs-lg' },
]

const confirmReset = async () => {
  const ok = await confirm({ icon: '🔄', title: t('common.reset'), message: t('settings.resetConfirm'), type: 'warning' })
  if (ok) resetSettings()
}

const clearData = async () => {
  const ok = await confirm({ icon: '🗑️', title: t('settings.clearData'), message: t('settings.clearConfirm'), type: 'danger', confirmText: t('settings.clearDataBtn') })
  if (ok) { localStorage.clear(); location.reload() }
}
</script>

<style>
.settings-page { min-height: 100vh; background: var(--muted-bg); padding: 20px 16px 60px; overflow-y: auto; }
.settings-container { max-width: 640px; margin: 0 auto; }

.settings-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.settings-header h1 { flex: 1; font-size: 22px; font-weight: 700; color: var(--text); }
.back-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid var(--card-border); border-radius: 8px; background: var(--card-bg); font-size: 14px; color: var(--text-secondary); cursor: pointer; }
.back-btn:hover { background: var(--hover-bg); color: var(--text); }
.reset-btn { padding: 6px 12px; border: 1px solid var(--card-border); border-radius: 8px; background: var(--card-bg); font-size: 13px; color: var(--text-muted); cursor: pointer; }
.reset-btn:hover { color: var(--danger); border-color: var(--danger); }

.settings-section { background: var(--card-bg); border-radius: 14px; overflow: hidden; margin-bottom: 14px; border: 1px solid var(--card-border); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
.section-title { font-size: 12px; font-weight: 600; color: var(--text-muted); padding: 11px 16px 9px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 6px; background: var(--bg-secondary); letter-spacing: 0.3px; text-transform: uppercase; }
.section-icon { font-size: 14px; }

.setting-item { display: flex; align-items: center; gap: 16px; padding: 13px 16px; border-bottom: 1px solid var(--border-subtle); }
.setting-item.col { flex-direction: column; align-items: stretch; }
.setting-item:last-child { border-bottom: none; }
.setting-info { flex: 1; min-width: 0; }
.setting-info label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; color: var(--text); cursor: default; }
.setting-info p { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.4; }
.danger-label { color: var(--danger) !important; }
.value-badge { font-size: 11px; font-weight: 600; color: var(--text-secondary); background: var(--hover-bg); padding: 1px 7px; border-radius: 20px; border: 1px solid var(--border); }

/* URL 行 */
.url-row { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.url-input { width: 100%; }
.url-hint { font-size: 11px; color: var(--text-muted); font-family: monospace; padding: 2px 4px; }

/* Key 行 */
.key-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
.key-input { flex: 1; }
.eye-btn { padding: 6px 10px; border: 1px solid var(--input-border); border-radius: 8px; background: var(--input-bg); cursor: pointer; font-size: 14px; flex-shrink: 0; }

/* 检测按钮 */
.detect-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1.5px solid var(--text); background: var(--card-bg); color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer; flex-shrink: 0; transition: background 0.15s; }
.detect-btn:hover:not(:disabled) { background: var(--hover-bg); }
.detect-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.detect-spin { width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--text); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 检测错误 */
.detect-error { padding: 10px 16px; background: rgba(248,113,113,0.1); border-top: 1px solid var(--border-subtle); font-size: 13px; color: var(--danger); }

/* 模型列表 */
.model-list-preview { padding: 8px 16px 12px; border-top: 1px solid var(--border-subtle); }
.model-group { margin-bottom: 8px; }
.model-group-title { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; color: var(--text-secondary); padding: 6px 8px; background: var(--hover-bg); border-radius: 6px; cursor: pointer; user-select: none; }
.model-group-title em { font-style: normal; font-weight: 400; color: var(--text-muted); }
.chevron { font-size: 10px; }
.model-group-items { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 4px 0; }
.model-chip { padding: 4px 10px; border: 1px solid var(--input-border); border-radius: 20px; font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; background: var(--card-bg); }
.model-chip:hover { border-color: var(--text-secondary); color: var(--text); }
.model-chip.selected { border-color: #60a5fa; color: #60a5fa; background: rgba(96,165,250,0.1); font-weight: 600; }

.s-select { min-width: 150px; padding: 7px 32px 7px 10px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 13px; background: var(--input-bg); color: var(--text); outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
.s-select:focus { border-color: var(--text-secondary); }
.s-input { width: 100%; padding: 7px 10px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 13px; color: var(--text); background: var(--input-bg); outline: none; }
.s-input:focus { border-color: var(--text-secondary); }
.s-textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 13px; font-family: inherit; resize: vertical; color: var(--text); background: var(--input-bg); outline: none; margin-top: 8px; line-height: 1.5; }
.s-textarea:focus { border-color: var(--text-secondary); }
.s-range { width: 160px; accent-color: var(--text); }

.s-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.s-toggle input { opacity: 0; width: 0; height: 0; }
.s-toggle-track { position: absolute; inset: 0; background: var(--border); border-radius: 24px; cursor: pointer; transition: background 0.2s; border: 1px solid var(--input-border); }
.s-toggle-track::before { content: ''; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.s-toggle input:checked + .s-toggle-track { background: #4ade80; border-color: #4ade80; }
.s-toggle input:checked + .s-toggle-track::before { transform: translateX(20px); }

.lang-picker { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 4px; }
.lang-btn { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1.5px solid var(--input-border); border-radius: 10px; background: var(--input-bg); font-size: 14px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; width: 100%; }
.lang-btn:hover { border-color: var(--text-secondary); color: var(--text); background: var(--hover-bg); }
.lang-btn.active { border-color: #60a5fa; color: var(--text); font-weight: 600; background: rgba(96,165,250,0.1); }
.lang-flag { font-size: 18px; flex-shrink: 0; }
.lang-name { font-size: 13px; }

.theme-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.theme-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 12px; border: 1.5px solid var(--input-border); border-radius: 10px; background: var(--input-bg); font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.theme-btn:hover { border-color: var(--text-secondary); color: var(--text); }
.theme-btn.active { border-color: #60a5fa; color: var(--text); font-weight: 600; background: rgba(96,165,250,0.1); }
.theme-preview { width: 28px; height: 18px; border-radius: 4px; }

.size-picker { display: flex; gap: 6px; }
.size-btn { width: 38px; height: 38px; border: 1.5px solid var(--input-border); border-radius: 8px; background: var(--input-bg); cursor: pointer; color: var(--text-secondary); font-weight: 600; transition: all 0.15s; }
.size-btn:hover { border-color: var(--text-secondary); color: var(--text); }
.size-btn.active { border-color: #60a5fa; color: var(--text); background: rgba(96,165,250,0.1); }
.fs-sm { font-size: 12px; } .fs-md { font-size: 15px; } .fs-lg { font-size: 18px; }

.danger-btn { padding: 7px 14px; border: 1px solid var(--danger); border-radius: 8px; background: transparent; color: var(--danger); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.danger-btn:hover { background: var(--danger); color: #fff; }

.about-card { display: flex; align-items: center; gap: 16px; padding: 16px; }
.about-logo { width: 48px; height: 48px; background: var(--hover-bg); border: 1px solid var(--border); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.about-info h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: var(--text); }
.about-info p { font-size: 13px; color: var(--text-muted); }
.about-links { margin-top: 6px !important; display: flex; gap: 8px; align-items: center; }
.about-links a { color: #60a5fa; text-decoration: none; font-size: 13px; }
.about-links a:hover { text-decoration: underline; }

.migrate-banner { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: rgba(251,191,36,0.1); border-bottom: 1px solid rgba(251,191,36,0.3); font-size: 13px; color: var(--text); }
.migrate-btn { align-self: flex-start; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #f59e0b; background: #f59e0b; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.migrate-btn:hover { background: #d97706; border-color: #d97706; }

.save-notice { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }

.detect-btn.test-ok { border-color: #4ade80; color: #4ade80; }
.detect-btn.test-fail { border-color: var(--danger); color: var(--danger); }

.test-result { margin: 0 16px 12px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); font-size: 13px; }
.test-result.ok { border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.06); }
.test-result.fail { border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.06); }
.test-result-row { display: flex; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); align-items: baseline; }
.test-result-row:last-child { border-bottom: none; }
.test-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; width: 36px; }
.test-value { color: var(--text); word-break: break-all; }
.mono { font-family: monospace; font-size: 12px; }
</style>

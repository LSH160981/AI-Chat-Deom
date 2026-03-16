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

      <!-- 语言 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🌐</span> {{ $t('settings.sectionLanguage') }}</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.language') }}</label>
            <p>{{ $t('settings.languageHint') }}</p>
          </div>
          <div class="lang-picker">
            <button
              v-for="lang in LANGUAGES"
              :key="lang.code"
              class="lang-btn"
              :class="{ active: currentLocale === lang.code }"
              @click="switchLang(lang.code)"
            >
              <span>{{ lang.flag }}</span>
              <span>{{ lang.label }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 对话设置 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">💬</span> {{ $t('settings.sectionChat') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.defaultModel') }}</label>
            <p>{{ $t('settings.defaultModelHint') }}</p>
          </div>
          <select v-model="settings.defaultModel" class="s-select">
            <optgroup v-for="group in MODEL_LIST" :key="group.label" :label="group.label">
              <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </optgroup>
          </select>
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
            <label>{{ $t('settings.webSearch') }}</label>
            <p>{{ $t('settings.webSearchHint') }}</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.webSearchEnabled" />
            <span class="s-toggle-track"></span>
          </label>
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

      <!-- 语音设置 -->
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

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.ttsProvider') }}</label>
            <p>{{ $t('settings.ttsProviderHint') }}</p>
          </div>
          <select v-model="settings.ttsProvider" class="s-select">
            <option value="openai">OpenAI</option>
            <option value="aws-polly">AWS Polly</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.ttsVoice') }}</label>
            <p>{{ $t('settings.ttsVoiceHint') }}</p>
          </div>
          <select v-model="settings.ttsVoice" class="s-select">
            <template v-if="settings.ttsProvider === 'openai'">
              <option v-for="v in TTS_VOICE_MAP.openai" :key="v.value" :value="v.value">{{ v.label }}</option>
            </template>
            <template v-else-if="settings.ttsProvider === 'aws-polly'">
              <option v-for="v in TTS_VOICE_MAP['aws-polly']" :key="v.value" :value="v.value">{{ v.label }}</option>
            </template>
            <template v-else>
              <option v-for="v in TTS_VOICE_MAP.elevenlabs" :key="v.value" :value="v.value">{{ v.label }}</option>
            </template>
          </select>
        </div>
      </section>

      <!-- 图片生成 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🎨</span> {{ $t('settings.sectionImage') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.imageModel') }}</label>
            <p>{{ $t('settings.imageModelHint') }}</p>
          </div>
          <select v-model="settings.imageModel" class="s-select">
            <option v-for="m in IMAGE_MODEL_LIST" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.imageQuality') }}</label>
            <p>{{ $t('settings.imageQualityHint') }}</p>
          </div>
          <select v-model="settings.imageQuality" class="s-select">
            <option value="low">{{ $t('settings.qualityLow') }}</option>
            <option value="medium">{{ $t('settings.qualityMedium') }}</option>
            <option value="high">{{ $t('settings.qualityHigh') }}</option>
          </select>
        </div>
      </section>

      <!-- 外观 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">✨</span> {{ $t('settings.sectionAppearance') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.theme') }}</label>
            <p>{{ $t('settings.themeHint') }}</p>
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
            <p>{{ $t('settings.fontSizeHint') }}</p>
          </div>
          <div class="size-picker">
            <button v-for="s in fontSizes" :key="s.value" class="size-btn" :class="[s.cls, { active: settings.fontSize === s.value }]" @click="settings.fontSize = s.value">A</button>
          </div>
        </div>
      </section>

      <!-- 高级 -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">⚙️</span> {{ $t('settings.sectionAdvanced') }}</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.sdkUrl') }}</label>
            <p>{{ $t('settings.sdkUrlHint') }}</p>
          </div>
          <input v-model="settings.puterSdkUrl" class="s-input" placeholder="https://js.puter.com/v2/" />
        </div>

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
              <span>·</span>
              <a href="https://docs.puter.com/AI/chat/" target="_blank">Puter.ai Docs</a>
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
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { settings, resetSettings } from '@/stores/settings'
import { MODEL_LIST, IMAGE_MODEL_LIST, TTS_VOICE_MAP } from '@/config/models'
import { LANGUAGES } from '@/i18n'
import { useModal } from '@/composables/useModal'

const { t, locale } = useI18n()
const currentLocale = computed(() => locale.value)
const { confirm } = useModal()

// 设置页需要可滚动，临时解除 body overflow: hidden
onMounted(() => {
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
})
onUnmounted(() => {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

const switchLang = (code) => {
  locale.value = code
  localStorage.setItem('ai-chat-lang', code)
}

const themes = [
  { value: 'light', labelKey: 'settings.themeLight', style: 'background:#fff;border:1px solid #ddd;' },
  { value: 'dark',  labelKey: 'settings.themeDark',  style: 'background:#1a1a1a;' },
  { value: 'system',labelKey: 'settings.themeSystem', style: 'background:linear-gradient(135deg,#fff 50%,#1a1a1a 50%);border:1px solid #ddd;' },
]

const fontSizes = [
  { value: 'sm', cls: 'fs-sm' },
  { value: 'md', cls: 'fs-md' },
  { value: 'lg', cls: 'fs-lg' },
]

const confirmReset = async () => {
  const ok = await confirm({
    icon: '🔄',
    title: t('common.reset'),
    message: t('settings.resetConfirm'),
    type: 'warning',
  })
  if (ok) resetSettings()
}

const clearData = async () => {
  const ok = await confirm({
    icon: '🗑️',
    title: t('settings.clearData'),
    message: t('settings.clearConfirm'),
    type: 'danger',
    confirmText: t('settings.clearDataBtn'),
  })
  if (ok) {
    localStorage.clear()
    location.reload()
  }
}
</script>

<style scoped>
.settings-page { min-height: 100vh; background: #f5f5f5; padding: 20px 16px 60px; overflow-y: auto; }
.settings-container { max-width: 640px; margin: 0 auto; }

.settings-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.settings-header h1 { flex: 1; font-size: 22px; font-weight: 700; color: #1a1a1a; }
.back-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 14px; color: #555; cursor: pointer; }
.back-btn:hover { background: #f5f5f5; }
.reset-btn { padding: 6px 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 13px; color: #888; cursor: pointer; }
.reset-btn:hover { color: #e53e3e; border-color: #e53e3e; }

.settings-section { background: #fff; border-radius: 14px; overflow: hidden; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.section-title { font-size: 13px; font-weight: 600; color: #888; padding: 14px 18px 10px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 6px; }
.section-icon { font-size: 15px; }

.setting-item { display: flex; align-items: center; gap: 16px; padding: 14px 18px; border-bottom: 1px solid #f5f5f5; }
.setting-item.col { flex-direction: column; align-items: stretch; }
.setting-item:last-child { border-bottom: none; }
.setting-info { flex: 1; min-width: 0; }
.setting-info label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; color: #1a1a1a; }
.setting-info p { font-size: 12px; color: #aaa; margin-top: 2px; }
.danger-label { color: #e53e3e !important; }
.value-badge { font-size: 12px; font-weight: 600; color: #555; background: #f0f0f0; padding: 1px 6px; border-radius: 20px; }

.s-select { min-width: 160px; padding: 7px 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; background: #fff; color: #1a1a1a; outline: none; cursor: pointer; }
.s-select:focus { border-color: #aaa; }
.s-input { min-width: 200px; padding: 7px 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; color: #1a1a1a; outline: none; font-family: monospace; }
.s-input:focus { border-color: #aaa; }
.s-textarea { width: 100%; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: inherit; resize: vertical; color: #1a1a1a; outline: none; margin-top: 8px; }
.s-textarea:focus { border-color: #aaa; }
.s-range { width: 160px; accent-color: #1a1a1a; }

.s-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.s-toggle input { opacity: 0; width: 0; height: 0; }
.s-toggle-track { position: absolute; inset: 0; background: #ddd; border-radius: 24px; cursor: pointer; transition: background 0.2s; }
.s-toggle-track::before { content: ''; position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.s-toggle input:checked + .s-toggle-track { background: #1a1a1a; }
.s-toggle input:checked + .s-toggle-track::before { transform: translateX(20px); }

/* 语言选择 */
.lang-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.lang-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border: 1.5px solid #e0e0e0; border-radius: 20px; background: #fff; font-size: 13px; color: #666; cursor: pointer; transition: all 0.15s; }
.lang-btn:hover { border-color: #aaa; color: #333; }
.lang-btn.active { border-color: #1a1a1a; color: #1a1a1a; font-weight: 600; background: #f8f8f8; }

/* 主题 */
.theme-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.theme-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 10px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: #fff; font-size: 12px; color: #666; cursor: pointer; }
.theme-btn.active { border-color: #1a1a1a; color: #1a1a1a; font-weight: 600; }
.theme-preview { width: 28px; height: 18px; border-radius: 4px; }

/* 字号 */
.size-picker { display: flex; gap: 6px; }
.size-btn { width: 36px; height: 36px; border: 1.5px solid #e0e0e0; border-radius: 8px; background: #fff; cursor: pointer; color: #666; font-weight: 600; }
.size-btn.active { border-color: #1a1a1a; color: #1a1a1a; }
.fs-sm { font-size: 12px; }
.fs-md { font-size: 15px; }
.fs-lg { font-size: 18px; }

/* 危险区 */
.danger-btn { padding: 7px 14px; border: 1px solid #e53e3e; border-radius: 8px; background: #fff; color: #e53e3e; font-size: 13px; cursor: pointer; }
.danger-btn:hover { background: #e53e3e; color: #fff; }

/* 关于 */
.about-card { display: flex; align-items: center; gap: 16px; padding: 16px 18px; }
.about-logo { width: 48px; height: 48px; background: #f0f0f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.about-info h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.about-info p { font-size: 13px; color: #888; }
.about-links { margin-top: 6px !important; display: flex; gap: 8px; align-items: center; }
.about-links a { color: #0066cc; text-decoration: none; font-size: 13px; }
.about-links a:hover { text-decoration: underline; }
.about-links span { color: #ccc; }

.save-notice { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #bbb; margin-top: 8px; }
</style>

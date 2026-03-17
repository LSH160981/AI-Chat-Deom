<!--
  ============================================================
  文件说明：SettingsPage.vue
  功能：应用设置页面（本地 localStorage 持久化）

  包含：
    - API 连接配置（Base URL / Key）
    - 模型检测 / 测试连接
    - 对话参数（默认模型 / 系统提示词 / 温度 / 上下文长度）
    - TTS / 文生图 / 外观 / 语言
    - 清除本地数据（危险操作）
  ============================================================
-->
<template>
  <div class="settings-page">
    <div class="settings-container">

      <!-- 页头：返回按钮 / 标题 / 重置按钮 -->
      <div class="settings-header">
        <button class="back-btn" @click="$router.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {{ $t('common.back') }}
        </button>
        <h1>{{ $t('settings.title') }}</h1>
        <!-- 点击后弹出确认框，确认则重置所有设置 -->
        <button class="reset-btn" @click="confirmReset">{{ $t('common.reset') }}</button>
      </div>

      <!-- ────────────── API 连接 ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🔌</span> API 连接</h2>

        <!-- 旧接口迁移提示横幅：仅当检测到旧接口地址时显示 -->
        <div v-if="isOldApi" class="migrate-banner">
          <span>⚠️ 检测到旧接口配置，建议切换到新接口</span>
          <button class="migrate-btn" @click="migrateToOpenRouter">一键切换到最新接口</button>
        </div>

        <!-- Base URL 输入 -->
        <div class="setting-item col">
          <div class="setting-info">
            <label>Base URL</label>
            <p>服务商地址，会自动补全路径（如 /v1）</p>
          </div>
          <div class="url-row">
            <!-- 失焦时触发 URL 规范化预览 -->
            <input
              v-model="settings.apiBaseUrl"
              class="s-input url-input"
              placeholder="https://api.openai.com"
              @blur="showNormalized"
            />
            <!-- 当规范化后的 URL 与输入不同时，给出提示 -->
            <span v-if="normalizedUrl" class="url-hint">→ {{ normalizedUrl }}</span>
          </div>
        </div>

        <!-- API Key 输入（支持明文/密文切换） -->
        <div class="setting-item col">
          <div class="setting-info">
            <label>API Key</label>
            <p>sk-... 或对应服务商的密钥</p>
          </div>
          <div class="key-row">
            <!-- :type 根据 showKey 动态切换 password / text -->
            <input
              v-model="settings.apiKey"
              :type="showKey ? 'text' : 'password'"
              class="s-input key-input"
              placeholder="sk-..."
              autocomplete="off"
            />
            <!-- 眼睛按钮：切换密钥明文/密文显示 -->
            <button class="eye-btn" @click="showKey = !showKey">
              {{ showKey ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <!-- 检测可用模型按钮 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>可用模型</label>
            <!-- 已检测时显示数量，否则显示引导文字 -->
            <p v-if="settings.detectedModels.length">已检测到 {{ settings.detectedModels.length }} 个模型</p>
            <p v-else>点击检测获取模型列表</p>
          </div>
          <!-- detecting 为 true 时按钮禁用并显示加载动画 -->
          <button class="detect-btn" :disabled="detecting || !settings.apiBaseUrl" @click="runDetect">
            <span v-if="detecting" class="detect-spin"></span>
            {{ detecting ? '检测中…' : '🔍 检测' }}
          </button>
        </div>

        <!-- 模型检测错误信息 -->
        <div v-if="detectError" class="detect-error">
          <span>⚠️ </span><span v-text="cleanError(detectError)"></span>
        </div>

        <!-- 测试连接：一键批量测试（对所有模型发同一条极简消息），失败项标红 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>测试连接</label>
            <p>一键测试所有模型（失败标红）</p>
          </div>
          <button
            class="detect-btn"
            :class="testStatus === 'ok' ? 'test-ok' : testStatus === 'fail' ? 'test-fail' : ''"
            :disabled="testing || !settings.apiBaseUrl || !settings.detectedModels.length"
            @click="runTestAll"
          >
            <span v-if="testing" class="detect-spin"></span>
            <template v-else-if="testStatus === 'ok'">✅ 全部可用</template>
            <template v-else-if="testStatus === 'fail'">⚠️ 存在失败</template>
            <template v-else>🧪 一键测试</template>
          </button>
        </div>

        <!-- 批量测试结果列表 -->
        <div v-if="testAllResults.length" class="test-all">
          <div
            v-for="r in testAllResults"
            :key="r.model"
            class="test-all-row"
            :class="r.ok ? 'ok' : 'fail'"
          >
            <span class="mono">{{ r.model }}</span>
            <span class="lat">{{ r.latency }}ms</span>
            <span class="reply" v-text="r.ok ? r.reply : cleanError(r.error)"></span>
          </div>
        </div>

        <!-- 批量测试失败时的汇总错误信息（可选） -->
        <div v-if="testError" class="detect-error">
          ⚠️ <span v-text="cleanError(testError)"></span>
        </div>

        <!-- 检测到的模型分组折叠列表 -->
        <div v-if="settings.detectedModels.length" class="model-list-preview">
          <div
            v-for="[gName, group] in groupedEntries"
            :key="gName"
            class="model-group"
          >
            <!-- 分组标题行：点击展开/折叠 -->
            <div class="model-group-title" @click="toggleGroup(gName)">
              <span>{{ gName }} <em>({{ group.length }})</em></span>
              <!-- 展开/折叠三角图标 -->
              <span class="chevron">{{ openGroups[gName] ? '▲' : '▼' }}</span>
            </div>
            <!-- 分组内模型 chip 列表，展开时显示 -->
            <div v-if="openGroups[gName]" class="model-group-items">
              <!-- 点击 chip 即选中该模型为默认模型，选中态高亮 -->
              <div
                v-for="m in group"
                :key="m.id"
                class="model-chip"
                :class="{ selected: settings.defaultModel === m.id }"
                @click="settings.defaultModel = m.id"
              >
                {{ m.displayName || m.name }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────── 对话设置 ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">💬</span> {{ $t('settings.sectionChat') }}</h2>

        <!-- 默认模型：检测前手动输入，检测后可从上方列表点击选择 -->
        <div class="setting-item col">
          <div class="setting-info">
            <label>{{ $t('settings.defaultModel') }}</label>
            <p>{{ settings.detectedModels.length ? '从上方列表点击选择，或手动输入' : '填写模型 ID，如 gpt-4o / claude-sonnet-4-5' }}</p>
          </div>
          <input v-model="settings.defaultModel" class="s-input" placeholder="gpt-4o" />
        </div>

        <!-- 系统提示词（System Prompt） -->
        <div class="setting-item col">
          <div class="setting-info">
            <label>{{ $t('settings.systemPrompt') }}</label>
            <p>{{ $t('settings.systemPromptHint') }}</p>
          </div>
          <textarea v-model="settings.systemPrompt" :placeholder="$t('settings.systemPromptPlaceholder')" class="s-textarea" rows="3"></textarea>
        </div>

        <!-- 温度滑块：0 ~ 2，控制输出随机性 -->
        <div class="setting-item">
          <div class="setting-info">
            <!-- value-badge 显示当前数值 -->
            <label>{{ $t('settings.temperature') }} <span class="value-badge">{{ settings.temperature }}</span></label>
            <p>{{ $t('settings.temperatureHint') }}</p>
          </div>
          <input type="range" v-model.number="settings.temperature" min="0" max="2" step="0.1" class="s-range" />
        </div>

        <!-- 上下文长度滑块：2 ~ 50 条，控制携带的历史消息数量 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.contextLength') }} <span class="value-badge">{{ settings.contextLength }} {{ $t('settings.contextLengthUnit') }}</span></label>
            <p>{{ $t('settings.contextLengthHint') }}</p>
          </div>
          <input type="range" v-model.number="settings.contextLength" min="2" max="50" step="2" class="s-range" />
        </div>

        <!-- Enter 发送开关 -->
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

      <!-- 语音 TTS / 图片生成相关设置已移除（本项目仅保留对话功能） -->

      <!-- ────────────── 外观 ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">✨</span> {{ $t('settings.sectionAppearance') }}</h2>

        <!-- 主题选择：三个按钮（浅色 / 深色 / 跟随系统） -->
        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.theme') }}</label>
          </div>
          <div class="theme-picker">
            <!-- active class 标记当前选中主题 -->
            <button v-for="t in themes" :key="t.value" class="theme-btn" :class="{ active: settings.theme === t.value }" @click="settings.theme = t.value">
              <span class="theme-preview" :style="t.style"></span>
              {{ $t(t.labelKey) }}
            </button>
          </div>
        </div>

        <!-- 字体大小选择：三个"A"按钮，字号不同 -->
        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.fontSize') }}</label>
          </div>
          <div class="size-picker">
            <!-- active class 标记当前选中字号 -->
            <button v-for="s in fontSizes" :key="s.value" class="size-btn" :class="[s.cls, { active: settings.fontSize === s.value }]" @click="settings.fontSize = s.value">A</button>
          </div>
        </div>
      </section>

      <!-- ────────────── 语言 ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">🌐</span> {{ $t('settings.sectionLanguage') }}</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>{{ $t('settings.sectionLanguage') }}</label>
            <p>切换界面语言</p>
          </div>
          <FancySelect
            :modelValue="currentLocale"
            @update:modelValue="switchLang"
            :items="LANGUAGES.map(l => ({ value: l.code, label: l.label, icon: l.flag }))"
            placeholder="选择语言"
          />
        </div>
      </section>

      <!-- ────────────── 危险区（数据清除） ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">⚙️</span> {{ $t('settings.sectionAdvanced') }}</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label class="danger-label">{{ $t('settings.clearData') }}</label>
            <p>{{ $t('settings.clearDataHint') }}</p>
          </div>
          <!-- 清除数据前需经过确认弹框 -->
          <button class="danger-btn" @click="clearData">{{ $t('settings.clearDataBtn') }}</button>
        </div>
      </section>

      <!-- ────────────── 关于 ────────────── -->
      <section class="settings-section">
        <h2 class="section-title"><span class="section-icon">ℹ️</span> {{ $t('settings.sectionAbout') }}</h2>
        <div class="about-card">
          <div class="about-logo">✦</div>
          <div class="about-info">
            <h3>AI Chat</h3>
            <p>{{ $t('settings.aboutDesc') }}</p>
            <p class="about-links">
              <a href="https://github.com/LSH160981/AI-Chat-Deom" target="_blank" rel="noreferrer">GitHub</a>
              <span class="dot">·</span>
              <a href="https://api.yexc.top" target="_blank" rel="noreferrer">默认接口</a>
            </p>
          </div>
        </div>
      </section>

      <!-- 底部自动保存提示 -->
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
/**
 * @file src/features/settings/pages/SettingsPage.vue
 * @description 设置页（UI 组织层）
 *
 * 设计原则：
 * - 页面只负责模板结构和样式；
 * - 业务逻辑全部在 useSettingsPage composable 中，便于维护与测试。
 */

import FancySelect from '@/components/ui/FancySelect.vue'
import { useSettingsPage } from '@/features/settings/composables/useSettingsPage'

const {
  t,
  settings,
  LANGUAGES,

  // url
  normalizedUrl,
  showNormalized,
  isOldApi,
  migrateToOpenRouter,

  // api key
  showKey,

  // model detect/test
  detecting,
  detectError,
  runDetect,
  testing,
  testStatus,
  testError,
  testAllResults,
  runTestAll,
  openGroups,
  groupedEntries,
  toggleGroup,
  cleanError,

  // i18n
  currentLocale,
  switchLang,

  // ui options
  themes,
  fontSizes,

  // dangerous
  confirmReset,
  clearData,
} = useSettingsPage()
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

.s-select {
  min-width: 170px;
  height: 36px;
  padding: 0 38px 0 12px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  background: linear-gradient(180deg, var(--input-bg), var(--card-bg));
  color: var(--text);
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 8px 18px rgba(0,0,0,0.06);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}
.s-select:hover {
  border-color: var(--text-secondary);
}
.s-select:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.25);
}
.s-select:active {
  transform: translateY(0.5px);
}

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

/* 语言选择：改为原生 <select>，避免 emoji 与多语言字体基线差异导致的对齐问题 */
.lang-picker, .lang-btn, .lang-flag, .lang-name { display: none; }

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

/* 批量测试列表 */
.test-all { margin: 0 16px 12px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); background: var(--card-bg); }
.test-all-row { display: grid; grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr); gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); align-items: center; font-size: 13px; }
.test-all-row:last-child { border-bottom: none; }
.test-all-row.ok { background: rgba(74,222,128,0.06); }
.test-all-row.fail { background: rgba(248,113,113,0.06); }
.test-all-row .lat { color: var(--text-muted); text-align: right; font-variant-numeric: tabular-nums; }
.test-all-row .reply { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: monospace; font-size: 12px; }
</style>

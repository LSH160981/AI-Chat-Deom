<template>
  <div class="settings-page">
    <div class="settings-container">
      <!-- 页头 -->
      <div class="settings-header">
        <button class="back-btn" @click="$router.back()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          返回
        </button>
        <h1>设置</h1>
        <button class="reset-btn" @click="confirmReset">重置默认</button>
      </div>

      <!-- 对话设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <span class="section-icon">💬</span> 对话
        </h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>默认模型</label>
            <p>每次新对话使用的模型</p>
          </div>
          <select v-model="settings.defaultModel" class="s-select">
            <optgroup v-for="group in MODEL_LIST" :key="group.label" :label="group.label">
              <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </optgroup>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>默认系统提示词</label>
            <p>设置 AI 的角色和行为规范</p>
          </div>
          <textarea
            v-model="settings.systemPrompt"
            placeholder="例如：你是一个专业的代码助手，回答简洁..."
            class="s-textarea"
            rows="3"
          ></textarea>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>默认温度 <span class="value-badge">{{ settings.temperature }}</span></label>
            <p>0 = 精确确定，2 = 高度随机</p>
          </div>
          <input type="range" v-model.number="settings.temperature" min="0" max="2" step="0.1" class="s-range" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>上下文长度 <span class="value-badge">{{ settings.contextLength }} 条</span></label>
            <p>每次请求携带的历史消息数量</p>
          </div>
          <input type="range" v-model.number="settings.contextLength" min="2" max="50" step="2" class="s-range" />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>联网搜索</label>
            <p>默认开启 Web Search（OpenAI 模型）</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.webSearchEnabled" />
            <span class="s-toggle-track"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>Enter 发送消息</label>
            <p>关闭后需点击按钮或 Ctrl+Enter</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.sendOnEnter" />
            <span class="s-toggle-track"></span>
          </label>
        </div>
      </section>

      <!-- 语音设置 -->
      <section class="settings-section">
        <h2 class="section-title">
          <span class="section-icon">🔊</span> 语音 (TTS)
        </h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>自动朗读回复</label>
            <p>AI 回复完成后自动播放语音</p>
          </div>
          <label class="s-toggle">
            <input type="checkbox" v-model="settings.ttsEnabled" />
            <span class="s-toggle-track"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>TTS 服务商</label>
            <p>语音合成使用的 AI 服务</p>
          </div>
          <select v-model="settings.ttsProvider" class="s-select">
            <option value="openai">OpenAI</option>
            <option value="aws-polly">AWS Polly</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>声音</label>
            <p>TTS 朗读声音风格</p>
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
        <h2 class="section-title">
          <span class="section-icon">🎨</span> 图片生成
        </h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>默认图片模型</label>
            <p>文生图使用的 AI 模型</p>
          </div>
          <select v-model="settings.imageModel" class="s-select">
            <option v-for="m in IMAGE_MODEL_LIST" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>图片质量</label>
            <p>影响生成速度和质量（OpenAI）</p>
          </div>
          <select v-model="settings.imageQuality" class="s-select">
            <option value="low">低（快速）</option>
            <option value="medium">中</option>
            <option value="high">高（慢）</option>
          </select>
        </div>
      </section>

      <!-- 外观 -->
      <section class="settings-section">
        <h2 class="section-title">
          <span class="section-icon">🎨</span> 外观
        </h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>主题</label>
            <p>界面颜色主题</p>
          </div>
          <div class="theme-picker">
            <button
              v-for="t in themes"
              :key="t.value"
              class="theme-btn"
              :class="{ active: settings.theme === t.value }"
              @click="settings.theme = t.value"
            >
              <span class="theme-preview" :style="t.style"></span>
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>字体大小</label>
            <p>聊天消息字号</p>
          </div>
          <div class="size-picker">
            <button
              v-for="s in fontSizes"
              :key="s.value"
              class="size-btn"
              :class="{ active: settings.fontSize === s.value }"
              @click="settings.fontSize = s.value"
            >{{ s.label }}</button>
          </div>
        </div>
      </section>

      <!-- 高级 -->
      <section class="settings-section">
        <h2 class="section-title">
          <span class="section-icon">⚙️</span> 高级
        </h2>

        <div class="setting-item">
          <div class="setting-info">
            <label>Puter SDK URL</label>
            <p>自定义 SDK 加载地址（高级用户）</p>
          </div>
          <input v-model="settings.puterSdkUrl" class="s-input" placeholder="https://js.puter.com/v2/" />
        </div>

        <div class="setting-item danger-zone">
          <div class="setting-info">
            <label>清除所有数据</label>
            <p>清除本地存储的设置和缓存</p>
          </div>
          <button class="danger-btn" @click="clearData">清除数据</button>
        </div>
      </section>

      <!-- 关于 -->
      <section class="settings-section">
        <h2 class="section-title">
          <span class="section-icon">ℹ️</span> 关于
        </h2>
        <div class="about-card">
          <div class="about-logo">✦</div>
          <div class="about-info">
            <h3>AI Chat</h3>
            <p>基于 Puter.ai 构建的开源 AI 助手</p>
            <p class="about-links">
              <a href="https://github.com/LSH160981/AI-Chat-Deom" target="_blank">GitHub</a>
              <span>·</span>
              <a href="https://docs.puter.com/AI/chat/" target="_blank">Puter.ai 文档</a>
            </p>
          </div>
        </div>
      </section>

      <!-- 保存提示 -->
      <div class="save-notice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        设置自动保存
      </div>
    </div>
  </div>
</template>

<script setup>
import { settings, resetSettings } from '@/stores/settings'
import { MODEL_LIST, IMAGE_MODEL_LIST, TTS_VOICE_MAP } from '@/config/models'

const themes = [
  { value: 'light', label: '浅色', style: 'background: #fff; border: 1px solid #ddd;' },
  { value: 'dark', label: '深色', style: 'background: #1a1a1a;' },
  { value: 'system', label: '跟随系统', style: 'background: linear-gradient(135deg, #fff 50%, #1a1a1a 50%); border: 1px solid #ddd;' },
]

const fontSizes = [
  { value: 'sm', label: 'A' },
  { value: 'md', label: 'A' },
  { value: 'lg', label: 'A' },
]

const confirmReset = () => {
  if (confirm('确认恢复所有设置到默认值？')) resetSettings()
}

const clearData = () => {
  if (confirm('确认清除所有本地数据？此操作不可恢复。')) {
    localStorage.clear()
    location.reload()
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px 16px 60px;
}

.settings-container {
  max-width: 640px;
  margin: 0 auto;
}

/* 页头 */
.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.settings-header h1 {
  flex: 1;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}
.back-btn:hover { background: #f5f5f5; }
.reset-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #888;
  cursor: pointer;
}
.reset-btn:hover { color: #e53e3e; border-color: #e53e3e; }

/* 分区 */
.settings-section {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-icon { font-size: 15px; }

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #f5f5f5;
}
.setting-item:last-child { border-bottom: none; }
.setting-info {
  flex: 1;
  min-width: 0;
}
.setting-info label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: default;
}
.setting-info p {
  font-size: 12px;
  color: #aaa;
  margin-top: 2px;
}
.value-badge {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 20px;
}

/* 控件 */
.s-select {
  min-width: 160px;
  padding: 7px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: #1a1a1a;
  outline: none;
  cursor: pointer;
}
.s-select:focus { border-color: #aaa; }

.s-input {
  min-width: 200px;
  padding: 7px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  color: #1a1a1a;
  outline: none;
  font-family: monospace;
}
.s-input:focus { border-color: #aaa; }

.s-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  color: #1a1a1a;
  outline: none;
  margin-top: 8px;
}
.s-textarea:focus { border-color: #aaa; }
.setting-item:has(.s-textarea) { flex-direction: column; align-items: stretch; }
.setting-item:has(.s-textarea) .setting-info { margin-bottom: 0; }

.s-range {
  width: 160px;
  accent-color: #1a1a1a;
}

/* Toggle */
.s-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.s-toggle input { opacity: 0; width: 0; height: 0; }
.s-toggle-track {
  position: absolute;
  inset: 0;
  background: #ddd;
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s;
}
.s-toggle-track::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.s-toggle input:checked + .s-toggle-track { background: #1a1a1a; }
.s-toggle input:checked + .s-toggle-track::before { transform: translateX(20px); }

/* 主题选择 */
.theme-picker { display: flex; gap: 8px; }
.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: border-color 0.15s;
}
.theme-btn.active { border-color: #1a1a1a; color: #1a1a1a; font-weight: 600; }
.theme-preview { width: 28px; height: 18px; border-radius: 4px; }

/* 字号选择 */
.size-picker { display: flex; gap: 6px; }
.size-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: #666;
  font-weight: 600;
  transition: border-color 0.15s;
}
.size-btn:nth-child(1) { font-size: 12px; }
.size-btn:nth-child(2) { font-size: 15px; }
.size-btn:nth-child(3) { font-size: 18px; }
.size-btn.active { border-color: #1a1a1a; color: #1a1a1a; }

/* 危险区 */
.danger-zone .setting-info label { color: #e53e3e; }
.danger-btn {
  padding: 7px 14px;
  border: 1px solid #e53e3e;
  border-radius: 8px;
  background: #fff;
  color: #e53e3e;
  font-size: 13px;
  cursor: pointer;
}
.danger-btn:hover { background: #e53e3e; color: #fff; }

/* 关于 */
.about-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
}
.about-logo {
  width: 48px;
  height: 48px;
  background: #f0f0f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.about-info h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.about-info p { font-size: 13px; color: #888; }
.about-links { margin-top: 6px !important; display: flex; gap: 8px; align-items: center; }
.about-links a { color: #0066cc; text-decoration: none; font-size: 13px; }
.about-links a:hover { text-decoration: underline; }
.about-links span { color: #ccc; }

/* 保存提示 */
.save-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #bbb;
  margin-top: 8px;
}
</style>

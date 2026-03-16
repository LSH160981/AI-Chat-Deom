# ✦ AI Chat

一个现代化的 AI 对话 Web 应用，基于 Vue 3 构建，支持任意 OpenAI 兼容 API，开箱即用。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)](https://vitejs.dev)

---

## ✨ 功能特性

### 🤖 AI 对话
- **流式输出**：逐字实时渲染，打字机效果
- **多模型支持**：填写任意 OpenAI 兼容接口，自动检测可用模型
- **多模态**：支持图片上传，发给视觉模型分析
- **系统提示词**：可在侧边栏快速设置 System Prompt
- **上下文长度**：可控制携带的历史消息条数

### 🎨 文生图
- 调用 `/images/generations` 接口生成图片
- 支持多种尺寸和质量配置
- 图片灯箱放大 + 一键下载

### 🎙️ 语音转文字
- 录音或上传音频文件
- 调用 Whisper 兼容接口转写

### 🔊 文字转语音
- 调用 TTS 接口合成语音
- 支持多种声音（alloy / nova / echo / onyx / shimmer / coral）
- AI 回复可单条朗读

### 🌐 国际化
- 支持 🇨🇳 中文 / 🇺🇸 English / 🇯🇵 日本語 / 🇰🇷 한국어 / 🇷🇺 Русский
- 语言偏好保存至 localStorage

### 🎨 外观定制
- 浅色 / 深色 / 跟随系统 三套主题
- 小 / 中 / 大 三档字体大小
- CSS 变量驱动，完整深色模式适配

---

## 🔌 API 兼容性

在设置页填写 **Base URL** 和 **API Key** 即可使用，无需任何代码改动。

应用会**自动识别服务商并补全路径**，例如：

| 输入地址 | 自动补全为 |
|---|---|
| `https://api.openai.com` | `…/v1` |
| `https://api.anthropic.com` | `…/v1` |
| `https://generativelanguage.googleapis.com` | `…/v1beta` |
| `https://openrouter.ai` | `…/api/v1` |
| `https://api.groq.com` | `…/openai/v1` |
| `http://localhost:11434`（Ollama） | `…/v1` |
| 其他自定义地址 | `…/v1`（兜底） |

**支持的服务商（不限于）：**

- [OpenAI](https://platform.openai.com)
- [Anthropic](https://console.anthropic.com)
- [Google Gemini](https://aistudio.google.com)
- [OpenRouter](https://openrouter.ai) — 聚合数百个模型，含大量**免费模型** 🆓
- [Groq](https://console.groq.com) — 超快推理速度
- [DeepSeek](https://platform.deepseek.com)
- [Mistral](https://console.mistral.ai)
- [xAI / Grok](https://console.x.ai)
- [Ollama](https://ollama.com) — 本地运行开源模型
- [SiliconFlow](https://siliconflow.cn)
- [阿里云百炼](https://bailian.console.aliyun.com)
- [月之暗面 Moonshot](https://platform.moonshot.cn)
- [智谱 AI](https://open.bigmodel.cn)
- 任何 OpenAI 兼容接口 ✅

---

## 🆓 免费 API 资源推荐

> 感谢以下平台为开发者提供的免费额度和开放接口，使本项目得以低门槛接入各类 AI 能力：

| 平台 | 免费内容 | 地址 |
|---|---|---|
| **api.yexc.top** | 本项目当前默认接口，提供 Claude / Gemini / GPT / DeepSeek 等最新模型，感谢 [api.yexc.top](https://api.yexc.top) 🙏 | [api.yexc.top](https://api.yexc.top) |
| **s2a.dgtw.de** | 感谢 [s2a.dgtw.de](https://s2a.dgtw.de) 提供的免费 OpenAI 兼容接口 🙏 | [s2a.dgtw.de](https://s2a.dgtw.de) |
| **OpenRouter** | 数十个免费模型（Llama、Gemma、Qwen 等），每日免费额度 | [openrouter.ai](https://openrouter.ai) |
| **Groq** | 免费 tier，Llama / Mixtral / Gemma 超快推理 | [groq.com](https://console.groq.com) |
| **Google AI Studio** | Gemini 系列模型免费 API Key | [aistudio.google.com](https://aistudio.google.com) |
| **DeepSeek** | 注册送额度，价格极低 | [platform.deepseek.com](https://platform.deepseek.com) |
| **SiliconFlow** | 注册送 14 元额度，多个开源模型免费 | [siliconflow.cn](https://siliconflow.cn) |
| **Ollama** | 本地运行，完全免费，无需 API Key | [ollama.com](https://ollama.com) |
| **Cloudflare Tunnel** | 免费内网穿透，无需公网 IP 即可外部访问 | [cloudflare.com](https://cloudflare.com) |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装 & 启动

```bash
# 克隆项目
git clone https://github.com/LSH160981/AI-Chat-Deom.git
cd AI-Chat-Deom

# 安装依赖
npm install

# 启动开发服务器（默认 5555 端口）
npm run dev -- --host 0.0.0.0 --port 5555
```

访问 `http://localhost:5555`，进入 **设置页** 填写 API 地址和 Key 即可使用。

### 生产构建

```bash
npm run build
# 产物在 dist/ 目录
```

---

## ⚙️ 配置说明

所有配置在**设置页（右下角齿轮图标）**完成，自动保存至 localStorage，无需编辑代码。

### API 连接

1. 填写 **Base URL**（如 `https://api.openai.com`），应用自动补全路径
2. 填写 **API Key**
3. 点击「🔍 检测」自动拉取可用模型列表
4. 点击「🧪 测试」验证连通性，显示延迟和模型回复

### 其他可配置项

| 选项 | 说明 |
|---|---|
| 默认模型 | 可从检测到的列表选择，或手动输入模型 ID |
| 系统提示词 | 全局 System Prompt |
| 温度 | 0–2，控制回复随机性 |
| 上下文长度 | 携带最近 N 条历史消息 |
| TTS 声音 | 合成语音的声音选择 |
| 图片尺寸/质量 | 文生图参数 |
| 主题 | 浅色 / 深色 / 跟随系统 |
| 字体大小 | 小 / 中 / 大 |
| 语言 | 5 种语言切换 |

---

## 📁 项目结构

```
src/
├── components/
│   ├── AIChat.vue              # 主入口（逻辑编排）
│   ├── AppSidebar.vue          # 侧边栏
│   ├── AppModal.vue            # 自定义弹窗
│   ├── SettingsPage.vue        # 设置页
│   └── views/
│       ├── ChatView.vue        # AI 对话界面
│       ├── ImageGenView.vue    # 文生图界面
│       ├── SpeechToTextView.vue# 语音转文字
│       └── TextToSpeechView.vue# 文字转语音
├── composables/
│   ├── useApiClient.js         # API 请求（流式/图片/TTS/STT）
│   ├── useModelDetector.js     # 自动检测可用模型
│   ├── useMarkdown.js          # Markdown + 代码高亮 + KaTeX
│   ├── useRecorder.js          # 录音逻辑
│   └── useModal.js             # 全局弹窗
├── stores/
│   └── settings.js             # 设置持久化（localStorage）
├── config/
│   └── models.js               # CHAT_MODES 等配置
├── i18n/
│   ├── index.js
│   └── locales/                # zh / en / ja / ko / ru
└── styles/
    └── app.css                 # 全局样式（CSS 变量）
```

---

## 🛠️ 技术栈

| 技术 | 用途 |
|---|---|
| [Vue 3](https://vuejs.org) | 前端框架，Composition API |
| [Vite 7](https://vitejs.dev) | 构建工具 |
| [vue-i18n 9](https://vue-i18n.intlify.dev) | 国际化 |
| [vue-router 4](https://router.vuejs.org) | 路由 |
| [markdown-it](https://github.com/markdown-it/markdown-it) | Markdown 渲染 |
| [highlight.js](https://highlightjs.org) | 代码高亮 |
| [KaTeX](https://katex.org) | 数学公式渲染 |

---

## 📝 开发日志

- **v1.0** — 基于 Puter.ai SDK 的初始版本
- **v2.0** — 重构为独立 API 接入，支持任意 OpenAI 兼容接口
  - 移除 Puter SDK 依赖
  - 新增智能 URL 补全（16+ 服务商规则）
  - 新增自动模型检测（`/models` 接口）
  - 新增连接测试（延迟 + 模型验证）
  - 完整深色主题适配（CSS 变量全覆盖）
  - 统一全局滚动条样式
  - iOS Safari 安全区域适配（`dvh` + `safe-area-inset-bottom`）
  - 自定义 Modal 替换所有浏览器原生弹窗
  - 国际化支持（中/英/日/韩/俄）
  - 文件按职责拆分（composables / stores / views）

---

## 📄 许可证

[MIT](LICENSE) © 2025 LSH160981

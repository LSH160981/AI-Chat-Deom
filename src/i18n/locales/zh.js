/**
 * @file src/i18n/locales/zh.js
 * @description 中文（简体）语言包
 *
 * 命名约定：
 * - common: 通用按钮/提示
 * - settings: 设置页
 * - chat/image/stt/tts: 各功能模块文案
 */
export default {
  // 通用
  common: {
    send: '发送',
    clear: '清空',
    back: '返回',
    reset: '重置默认',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    copy: '复制',
    copied: '已复制',
    failed: '失败',
    loading: '加载中...',
    settings: '设置',
    newChat: '新对话',
    autoSaved: '设置自动保存',
    menu: '菜单',
  },

  // 侧边栏模式
  modes: {
    chat: 'AI 对话',
    txt2img: '文生图',
    speech2txt: '语音转文字',
    txt2speech: '文字转语音',
  },

  // 对话
  chat: {
    placeholder: '给 AI 发消息...',
    empty: '有什么可以帮你的？',
    disclaimer: 'AI 生成内容可能存在错误，请核实重要信息',
    thinking: '正在思考...',
    error: '出错了：{msg}',
    stopSpeak: '停止',
    speak: '朗读',
    uploadImage: '上传图片',
    voiceInput: '语音输入',
  },

  // 文生图
  image: {
    empty: 'AI 图片生成',
    emptyHint: '描述你想要的图片',
    generating: '正在生成图片...',
    placeholder: '描述你想要的图片，例如：一只在咖啡馆读书的猫...',
    download: '↓ 下载',
    failed: '图片生成失败：{msg}',
  },

  // 语音转文字
  stt: {
    empty: '语音转文字',
    emptyHint: '录音或上传音频文件',
    transcribing: '正在转录...',
    startRecord: '🎙 开始录音',
    stopRecord: '⏹ 停止录音',
    uploadAudio: '📁 上传音频文件',
    clearResult: '清空',
    failed: '转录失败：{msg}',
    micDenied: '麦克风权限被拒绝',
    or: '或',
  },

  // 文字转语音
  tts: {
    empty: '文字转语音',
    emptyHint: '支持 OpenAI / AWS Polly / ElevenLabs',
    synthesizing: '正在合成语音...',
    placeholder: '输入要转换为语音的文字...',
    failed: '语音合成失败：{msg}',
  },

  // 设置页
  settings: {
    title: '设置',
    resetConfirm: '确认恢复所有设置到默认值？',
    clearConfirm: '确认清除所有本地数据？此操作不可恢复。',

    // 分区
    sectionChat: '对话',
    sectionTTS: '语音 (TTS)',
    sectionImage: '图片生成',
    sectionAppearance: '外观',
    sectionAdvanced: '高级',
    sectionAbout: '关于',
    sectionLanguage: '语言',

    // 对话设置
    defaultModel: '默认模型',
    defaultModelHint: '每次新对话使用的模型',
    systemPrompt: '默认系统提示词',
    systemPromptHint: '设置 AI 的角色和行为规范',
    systemPromptPlaceholder: '例如：你是一个专业的代码助手，回答简洁...',
    temperature: '默认温度',
    temperatureHint: '0 = 精确确定，2 = 高度随机',
    contextLength: '上下文长度',
    contextLengthHint: '每次请求携带的历史消息数量',
    contextLengthUnit: '条',
    webSearch: '联网搜索',
    webSearchHint: '默认开启 Web Search（OpenAI 模型）',
    sendOnEnter: 'Enter 发送消息',
    sendOnEnterHint: '关闭后需点击按钮或 Ctrl+Enter',

    // TTS
    autoRead: '自动朗读回复',
    autoReadHint: 'AI 回复完成后自动播放语音',
    ttsProvider: 'TTS 服务商',
    ttsProviderHint: '语音合成使用的 AI 服务',
    ttsVoice: '声音',
    ttsVoiceHint: 'TTS 朗读声音风格',

    // 图片
    imageModel: '默认图片模型',
    imageModelHint: '文生图使用的 AI 模型',
    imageQuality: '图片质量',
    imageQualityHint: '影响生成速度和质量（OpenAI）',
    qualityLow: '低（快速）',
    qualityMedium: '中',
    qualityHigh: '高（慢）',

    // 外观
    theme: '主题',
    themeHint: '界面颜色主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
    fontSize: '字体大小',
    fontSizeHint: '聊天消息字号',

    // 高级
    sdkUrl: 'Puter SDK URL',
    sdkUrlHint: '自定义 SDK 加载地址（高级用户）',
    clearData: '清除所有数据',
    clearDataHint: '清除本地存储的设置和缓存',
    clearDataBtn: '清除数据',

    // 关于
    aboutDesc: '一个轻量、开箱即用的多模型 AI 聊天前端（支持 OpenAI/Anthropic/Gemini 兼容接口，支持流式输出、本地存储）。',

    // 语言
    language: '界面语言',
    languageHint: '切换应用显示语言',
  },
}

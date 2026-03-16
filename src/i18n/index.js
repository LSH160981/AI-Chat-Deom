import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import ru from './locales/ru'

// 从 localStorage 读取语言设置，默认中文
const savedLang = localStorage.getItem('ai-chat-lang') || 'zh'

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'zh',
  messages: { zh, en, ja, ko, ru },
})

export default i18n

export const LANGUAGES = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
]

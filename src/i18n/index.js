/**
 * @file i18n/index.js
 * @description 国际化（i18n）配置入口
 *
 * 使用 vue-i18n v9（Composition API 模式）初始化多语言支持。
 * 支持的语言：中文（默认）、英文、日文、韩文、俄文。
 *
 * 语言设置持久化：
 *  - 读取：从 localStorage 的 'ai-chat-lang' 键读取上次选择的语言
 *  - 写入：由设置页的 switchLang() 函数负责写入
 *
 * 导出：
 *  - default     vue-i18n 实例（在 main.js 中通过 app.use(i18n) 注册）
 *  - LANGUAGES   支持的语言列表（用于设置页语言选择器渲染）
 */
import { createI18n } from 'vue-i18n'
// 导入各语言的翻译资源文件
import zh from './locales/zh'  // 中文
import en from './locales/en'  // 英文
import ja from './locales/ja'  // 日文
import ko from './locales/ko'  // 韩文
import ru from './locales/ru'  // 俄文

/** 从 localStorage 读取上次保存的语言设置，若无则默认使用中文 */
const savedLang = localStorage.getItem('ai-chat-lang') || 'zh'

/**
 * 创建 vue-i18n 实例。
 *
 * 配置项说明：
 *  - legacy: false       使用 Composition API 模式（useI18n()），而非 Options API 的 $t()
 *                        注意：即使 legacy=false，模板中的 $t() 仍然可用
 *  - locale              当前激活的语言代码
 *  - fallbackLocale      当目标语言缺少某条翻译时，回退到中文
 *  - messages            包含所有语言翻译内容的对象
 */
const i18n = createI18n({
  legacy: false,           // 使用 Composition API 模式
  locale: savedLang,       // 初始语言（从 localStorage 或默认 'zh'）
  fallbackLocale: 'zh',    // 缺失翻译时回退到中文
  messages: { zh, en, ja, ko, ru }, // 注册所有语言包
})

export default i18n

/**
 * 应用支持的语言列表。
 * 用于设置页「语言选择」区域的按钮渲染。
 *
 * 每项字段：
 *  - code  语言代码（与 i18n.locale 值一致）
 *  - label 语言的本地名称
 *  - flag  国旗 Emoji（装饰用）
 */
export const LANGUAGES = [
  { code: 'zh', label: '中文', flag: new URL('../assets/flags/cn.svg', import.meta.url).href },
  { code: 'en', label: 'English', flag: new URL('../assets/flags/us.svg', import.meta.url).href },
  { code: 'ja', label: '日本語', flag: new URL('../assets/flags/jp.svg', import.meta.url).href },
  { code: 'ko', label: '한국어', flag: new URL('../assets/flags/kr.svg', import.meta.url).href },
  { code: 'ru', label: 'Русский', flag: new URL('../assets/flags/ru.svg', import.meta.url).href },
]

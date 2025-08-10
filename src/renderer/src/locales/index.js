import { createI18n } from 'vue-i18n'
import zhCN from './modules/zh-CN'
import enUS from './modules/en-US'

// 获取浏览器语言
const getDefaultLocale = () => {
  const savedLocale = ls.get(LANGUAGE)
  if (savedLocale) {
    return savedLocale
  }
  
  const browserLang = navigator.language || navigator.userLanguage
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
export { i18n }

// 切换语言的工具函数
export const setLocale = (locale) => {
  i18n.global.locale.value = locale
  ls.set(LANGUAGE, locale)
  document.documentElement.lang = locale
}

// 获取当前语言
export const getLocale = () => {
  return i18n.global.locale.value
} 
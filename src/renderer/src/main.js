// 引入polyfill
import './utils/polyfills.js'

// 确保全局注入的变量在打包后也能正常工作
import './utils/globalInject.js'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import ElementPlusX from 'vue-element-plus-x'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import i18n from './locales'
import 'element-plus/dist/index.css'
import '@/assets/styles/base.styl'
import '@/assets/styles/element.styl'
import '@/assets/styles/font.styl'
import 'highlight.js/styles/a11y-dark.css'
import 'virtual:uno.css'
import '@/assets/styles/iconfont.css'
// Stagewise integration - only in development mode
if (import.meta.env.MODE === 'development' && import.meta.env.VITE_STAGEWISE_ENABLED === 'true') {
  import('@stagewise/toolbar-vue').then(({ StagewiseToolbar }) => {
    const stagewiseConfig = {
      plugins: []
    }
    
    const stagewiseApp = createApp(StagewiseToolbar, { config: stagewiseConfig })
    const stagewiseContainer = document.createElement('div')
    stagewiseContainer.id = 'stagewise-toolbar'
    document.body.appendChild(stagewiseContainer)
    stagewiseApp.mount('#stagewise-toolbar')
  })
}

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(router)
app.use(createPinia())
app.use(ElementPlusX)
app.use(i18n)

app.mount('#app')
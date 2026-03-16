/**
 * @file main.js
 * @description 应用入口文件
 *
 * 负责：
 *  1. 创建 Vue 应用实例
 *  2. 注册全局插件（Vue Router、vue-i18n 国际化）
 *  3. 引入全局样式
 *  4. 将应用挂载到 index.html 的 #app 节点
 */
import { createApp } from 'vue'
import router from './router'      // Vue Router 路由实例
import i18n from './i18n'          // vue-i18n 国际化实例
import App from './App.vue'        // 根组件
import './assets/main.css'         // 全局 CSS 样式（包括 CSS 变量、主题等）

/** 创建 Vue 应用实例，以 App.vue 作为根组件 */
const app = createApp(App)

/** 注册路由插件，启用 <router-view> 和 <router-link> 等功能 */
app.use(router)

/** 注册国际化插件，启用 $t() 翻译函数和 useI18n() composable */
app.use(i18n)

/** 将应用挂载到 index.html 中 id="app" 的 DOM 节点 */
app.mount('#app')

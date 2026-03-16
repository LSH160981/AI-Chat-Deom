/**
 * @file main.js
 * @description 应用入口文件
 *
 * 负责：
 *  1. 创建 Vue 应用实例
 *  2. 注册全局插件（Vue Router、vue-i18n 国际化）
 *  3. 注册全局组件（AppIcon）
 *  4. 引入全局样式
 *  5. 将应用挂载到 index.html 的 #app 节点
 */
import { createApp } from 'vue'
import router from './router'           // Vue Router 路由实例
import i18n from './i18n'               // vue-i18n 国际化实例（全局注入 $t / useI18n）
import App from './App.vue'             // 根组件
import AppIcon from './components/AppIcons.vue'  // 全局 SVG 图标组件
import './assets/main.css'              // 全局 CSS 样式

/** 创建 Vue 应用实例 */
const app = createApp(App)

/** 注册路由插件，启用 <router-view> 和 <router-link> */
app.use(router)

/** 注册国际化插件，全局可用 $t() 和 useI18n() */
app.use(i18n)

/** 全局注册 AppIcon，任意组件无需 import 直接使用 <AppIcon name="..." /> */
app.component('AppIcon', AppIcon)

/** 挂载到 #app */
app.mount('#app')

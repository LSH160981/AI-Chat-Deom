# AI Chat WebApp

一个基于 Vue 3 + Puter.ai 的 AI 对话网页应用。

## 功能特性

- 🤖 AI 对话（Puter.ai gpt-5-nano 模型）
- 📝 Markdown 渲染（标题、列表、表格等）
- 💻 代码高亮（支持多种编程语言）
- 🔢 数学公式渲染（KaTeX）
- 📋 代码一键复制
- 📱 响应式设计（支持手机/桌面）
- 💬 上下文对话记忆

## 技术栈

- Vue 3
- Vite
- Tailwind CSS
- markdown-it（Markdown 解析）
- highlight.js（代码高亮）
- KaTeX（数学公式）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 使用说明

1. 访问 http://localhost:5555
2. 在输入框中输入消息
3. 按 Enter 或点击发送按钮
4. AI 会自动回复

### Markdown 语法

- **粗体**：`**粗体**`
- *斜体*：`*斜体*`
- 代码块：\`\`\`语言\n代码\n\`\`\`
- 行内代码：`代码`
- 链接：[文本](url)
- 列表：- 项目

### 数学公式

- 行内公式：`$公式$`
- 块级公式：`$$公式$$`

示例：
- `$E=mc^2$`
- `$$\int_0^1 x^2 dx$$`

## 项目结构

```
my-vue-app/
├── src/
│   ├── components/
│   │   └── AIChat.vue    # 主聊天组件
│   ├── App.vue
│   ├── main.js
│   └── assets/
│       └── main.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 配置

### 端口修改

在 `vite.config.js` 中修改端口：

```js
export default defineConfig({
  server: {
    port: 5555,
    host: true
  }
})
```

### AI 模型

在 `src/components/AIChat.vue` 中修改模型：

```js
const MODEL = 'gpt-5-nano'
```

支持的模型：
- gpt-5-nano
- gemini-2.0-flash
- claude-3-haiku

## 部署

### 构建

```bash
npm run build
```

### 使用 Nginx 部署

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### HTTPS 配置

使用 Let's Encrypt 免费证书：

```bash
sudo certbot --nginx -d your-domain.com
```

## 注意事项

- Puter.ai 需要登录才能使用
- 首次使用需在浏览器中完成登录
- AI 生成内容可能存在错误，请核实重要信息

## 许可证

MIT

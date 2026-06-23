# AI 聊天助手 - 云函数版本

一个基于 **微信小程序云函数** 的 AI 聊天助手，支持：
- ✅ **codingplan API**（当前使用）
- ✅ **混元 AI**（预留，后续上线使用）
- ✅ **云函数部署**（无需独立服务器）
- ✅ **本地开发调试**
- ✅ **对话历史记录**

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [部署步骤](#部署步骤)
- [API 说明](#api-说明)
- [常见问题](#常见问题)

---

## 功能特性

### ✨ 核心功能
- 🤖 **智能对话**：集成 AI 模型，支持多轮对话
- 🎭 **情绪识别**：自动分析用户情绪，提供情感支持
- 📝 **历史记录**：自动保存对话历史，支持查看和清空
- 🎨 **快捷回复**：提供情绪短语快捷选择
- 💾 **本地缓存**：支持离线查看历史对话

### 🌟 AI 提供商
- **codingplan API**：当前使用的 AI 服务
- **混元 AI**：预留接口，后续上线使用

---

## 技术栈

- **前端框架**：Taro 4 + React 18
- **云函数**：微信小程序云函数
- **状态管理**：React Hooks
- **样式**：TailwindCSS 4
- **包管理**：pnpm

---

## 项目结构

```
ai-chat-assistant/
├── cloudfunctions/          # 云函数目录
│   └── chat/               # chat 云函数
│       ├── index.js       # 云函数主代码
│       └── package.json   # 依赖配置
├── dist/                   # 小程序构建产物
├── src/                    # 前端源码
│   ├── pages/             # 页面
│   │   └── index/        # 聊天页面
│   ├── app.ts            # 应用入口
│   ├── app.config.ts     # 应用配置
│   └── network.ts        # 网络请求封装
├── project.config.json    # 小程序配置
├── .env.local            # 环境变量
└── README.md             # 项目说明
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd ai-chat-assistant
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

编辑 `.env.local` 文件：

```bash
# 微信小程序 AppID
TARO_APP_WEAPP_APPID=your_app_id

# 云函数环境 ID
TARO_APP_CLOUD_ENV_ID=your_cloud_env_id

# codingplan API 配置
CODINGPLAN_API_URL=https://api.codingplan.com/v1
CODINGPLAN_API_KEY=your_api_key
CODINGPLAN_MODEL=gpt-4

# 混元 AI 配置（后续使用）
HUNYUAN_API_URL=https://hunyuan.tencentcloudapi.com
HUNYUAN_SECRET_ID=your_secret_id
HUNYUAN_SECRET_KEY=your_secret_key
HUNYUAN_MODEL=hunyuan-lite

# AI 提供商
AI_PROVIDER=codingplan
```

### 4. 构建小程序

```bash
pnpm build:weapp
```

### 5. 在微信开发者工具中打开

1. 打开微信开发者工具
2. 导入项目，目录选择 `dist/`
3. 填写 AppID
4. 点击"导入"

---

## 配置说明

### 🔧 codingplan API 配置

请在 `.env.local` 中配置：

```bash
CODINGPLAN_API_URL=https://api.codingplan.com/v1
CODINGPLAN_API_KEY=your_api_key
CODINGPLAN_MODEL=gpt-4
```

**参数说明：**
- `CODINGPLAN_API_URL`：codingplan API 的基础 URL
- `CODINGPLAN_API_KEY`：你的 API Key
- `CODINGPLAN_MODEL`：使用的模型名称（如 gpt-4、gpt-3.5-turbo 等）

### 🔧 混元 AI 配置（预留）

后续上线时，修改 `.env.local`：

```bash
# 切换到混元 AI
AI_PROVIDER=hunyuan

# 配置混元 AI
HUNYUAN_SECRET_ID=your_secret_id
HUNYUAN_SECRET_KEY=your_secret_key
HUNYUAN_MODEL=hunyuan-lite
```

---

## 部署步骤

### 📱 步骤 1：创建云开发环境

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" → "云开发"
3. 点击"开通"（首次使用）
4. 创建环境，获取**环境 ID**

### 📱 步骤 2：创建数据库集合

在云开发控制台中：

1. 进入"数据库"
2. 创建集合 `conversations`
3. 无需设置字段权限，使用默认配置

### 📱 步骤 3：部署云函数

**方式一：使用微信开发者工具**

1. 在微信开发者工具中，找到 `cloudfunctions/chat` 目录
2. 右键点击 `chat` 文件夹
3. 选择"上传并部署：云端安装依赖"
4. 等待部署完成

**方式二：使用命令行**

```bash
# 安装微信开发者工具命令行工具
npm install -g miniprogram-ci

# 部署云函数
miniprogram-ci upload \
  --project . \
  --version 1.0.0 \
  --desc "部署 chat 云函数"
```

### 📱 步骤 4：配置环境变量

在云开发控制台中：

1. 进入"云函数" → "chat" → "配置"
2. 添加环境变量：
   ```
   CODINGPLAN_API_URL=https://api.codingplan.com/v1
   CODINGPLAN_API_KEY=your_api_key
   CODINGPLAN_MODEL=gpt-4
   AI_PROVIDER=codingplan
   ```

### 📱 步骤 5：构建并上传小程序

```bash
# 构建小程序
pnpm build:weapp

# 在微信开发者工具中上传
# 1. 打开微信开发者工具
# 2. 导入 dist/ 目录
# 3. 点击"上传"
```

### 📱 步骤 6：提交审核和发布

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"版本管理"
3. 提交审核
4. 审核通过后发布

---

## API 说明

### 📡 云函数 API

#### 调用方式

```typescript
import Taro from '@tarojs/taro'

// 调用云函数
Taro.cloud.callFunction({
  name: 'chat',
  data: {
    action: 'chat',  // 操作类型
    data: {
      message: '你好',  // 用户消息
    }
  }
}).then(res => {
  console.log(res.result)
})
```

#### 操作类型

##### 1. 发送消息

```javascript
{
  action: 'chat',
  data: {
    message: '用户消息'
  }
}
```

**响应：**
```javascript
{
  success: true,
  data: {
    message: 'AI回复内容',
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300
    }
  }
}
```

##### 2. 获取历史记录

```javascript
{
  action: 'getHistory',
  data: {}
}
```

**响应：**
```javascript
{
  success: true,
  data: [
    {
      role: 'user',
      content: '用户消息'
    },
    {
      role: 'assistant',
      content: 'AI回复'
    }
  ]
}
```

##### 3. 清空历史记录

```javascript
{
  action: 'clearHistory',
  data: {}
}
```

**响应：**
```javascript
{
  success: true,
  message: '历史记录已清空'
}
```

---

## 常见问题

### ❓ Q1：云函数部署失败怎么办？

**A：**
1. 确认云开发环境已开通
2. 确认 `cloudfunctions/chat/package.json` 配置正确
3. 检查云函数代码语法是否正确
4. 在微信开发者工具中查看云函数日志

### ❓ Q2：API 调用失败？

**A：**
1. 检查 `.env.local` 中的 API 配置是否正确
2. 检查云函数环境变量是否已配置
3. 查看云函数日志，确认错误原因
4. 确认 API Key 是否有效

### ❓ Q3：如何切换到混元 AI？

**A：**
1. 在 `.env.local` 中修改：
   ```bash
   AI_PROVIDER=hunyuan
   ```
2. 配置混元 AI 的 `HUNYUAN_SECRET_ID` 和 `HUNYUAN_SECRET_KEY`
3. 重新部署云函数

### ❓ Q4：云函数超时怎么办？

**A：**
1. 在云开发控制台中，修改云函数超时时间（最大 60 秒）
2. 优化云函数代码，减少处理时间
3. 考虑使用异步处理方式

### ❓ Q5：如何查看云函数日志？

**A：**
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" → "云开发"
3. 进入"云函数" → "chat"
4. 查看"日志"和"监控"

---

## 📞 支持

如有问题，请：
1. 查看 [云函数文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
2. 查看 [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/)
3. 联系技术支持

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Taro](https://taro.zone/)
- [微信小程序云开发](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/)
- [codingplan](https://codingplan.com/)
- [腾讯混元](https://hunyuan.tencent.com/)

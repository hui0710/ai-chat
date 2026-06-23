# Codingplan API 配置指南

## 📋 需要提供的信息

请提供以下信息，以便正确配置 codingplan API：

### 必填信息

1. **API 基础 URL**
   - 示例：`https://api.codingplan.com/v1`
   - 用途：所有 API 请求的基础路径

2. **API Key / Token**
   - 示例：`sk-xxxxx...`
   - 用途：API 认证

3. **模型名称**
   - 示例：`gpt-4`、`gpt-3.5-turbo`
   - 用途：指定使用的 AI 模型

### 可选信息

4. **API 文档链接**
   - 用途：查看完整的 API 使用说明

5. **请求格式示例**
   - 用途：确认请求参数的格式

6. **响应格式示例**
   - 用途：确认响应数据的解析方式

---

## 🔧 配置步骤

### 方式一：在云开发控制台配置（推荐）

1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入"云函数" → "chat"
3. 点击"配置" → "环境变量"
4. 添加以下环境变量：

```
CODINGPLAN_API_URL=https://api.codingplan.com/v1
CODINGPLAN_API_KEY=你的_API_KEY
CODINGPLAN_MODEL=gpt-4
AI_PROVIDER=codingplan
```

### 方式二：在 .env.local 文件中配置

```bash
CODINGPLAN_API_URL=https://api.codingplan.com/v1
CODINGPLAN_API_KEY=你的_API_KEY
CODINGPLAN_MODEL=gpt-4
```

---

## 🔍 API 调用方式

### 当前假设的调用方式

云函数代码中假设使用 OpenAI 兼容的 API 格式：

```javascript
// 请求格式
{
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "你是一个温暖的陪伴者..."
    },
    {
      role: "user",
      content: "你好"
    }
  ],
  temperature: 0.7,
  max_tokens: 1000
}

// 响应格式
{
  choices: [
    {
      message: {
        content: "你好呀！今天过得怎么样？"
      }
    }
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 200,
    total_tokens: 300
  }
}
```

### 如果 API 格式不同

如果你的 API 格式与上述不同，请提供：
1. **请求格式**：完整的请求参数结构
2. **响应格式**：完整的响应数据结构
3. **认证方式**：Header、Query、或其他

我会根据实际 API 格式修改云函数代码。

---

## 📝 示例配置

### 示例 1：OpenAI 格式

```javascript
// 环境变量
CODINGPLAN_API_URL=https://api.openai.com/v1
CODINGPLAN_API_KEY=sk-xxxxx
CODINGPLAN_MODEL=gpt-4

// 请求
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-xxxxx
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [...]
}
```

### 示例 2：自定义格式

```javascript
// 环境变量
CODINGPLAN_API_URL=https://api.example.com/chat
CODINGPLAN_API_KEY=your-custom-key
CODINGPLAN_MODEL=custom-model

// 请求
POST https://api.example.com/chat
X-API-Key: your-custom-key
Content-Type: application/json

{
  "query": "你好",
  "model": "custom-model"
}
```

---

## ⚠️ 注意事项

1. **API Key 安全**
   - 不要将 API Key 提交到代码仓库
   - 使用环境变量存储
   - 定期更换 API Key

2. **API 限流**
   - 检查 API 的调用限制
   - 实现错误重试机制
   - 记录 API 调用日志

3. **费用控制**
   - 监控 API 调用量和费用
   - 设置费用上限
   - 优化调用策略

---

## 🤔 常见问题

### Q：如何测试 API 是否正常？

**A：** 可以使用 curl 测试：

```bash
curl -X POST https://api.codingplan.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

### Q：云函数如何调用外部 API？

**A：** 使用 `cloud.request`：

```javascript
const response = await new Promise((resolve, reject) => {
  cloud.request({
    url: 'https://api.example.com/endpoint',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    data: { /* 请求数据 */ },
    success: resolve,
    fail: reject,
  })
})
```

---

## 📞 联系方式

如果需要帮助配置 codingplan API，请提供：
1. API 文档链接（如果有）
2. API 调用示例（curl 或 Postman）
3. 请求和响应的数据格式

我会帮你修改云函数代码！

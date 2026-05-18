# 🚀 快速部署指南（5分钟上手）

## 📋 你需要准备的

1. ✅ 微信开发者工具（已安装）
2. ✅ 腾讯云账号（免费注册）
3. ✅ 微信小程序 AppID（可用测试号）

---

## 🎯 第一步：获取腾讯云密钥（2分钟）

### 1. 注册腾讯云账号

访问：https://cloud.tencent.com/
点击"免费注册"，按提示完成注册

### 2. 获取 API 密钥

1. 登录腾讯云控制台
2. 点击右上角"访问管理" → "访问密钥" → "API 密钥管理"
3. 点击"新建密钥"
4. **复制并保存**：
   - SecretId：`AKIDxxxxxxxx`
   - SecretKey：`xxxxxxxx`

⚠️ **重要**：SecretKey 只显示一次！

### 3. 开通混元 AI

访问：https://console.cloud.tencent.com/hunyuan
点击"立即开通"（免费，无需付费）

---

## 🎯 第二步：下载项目并配置（1分钟）

### 1. 下载项目

从当前环境下载项目代码（或使用 git clone）

### 2. 安装依赖

```bash
cd ai-chat-assistant
pnpm install
```

### 3. 修改配置

打开 `.env.local` 文件，填入你的密钥：

```bash
# 云开发环境ID（先填一个临时的，后面会改）
TARO_APP_CLOUD_ENV_ID=test-env

# AI 配置
AI_PROVIDER=hunyuan

# 填入你的腾讯云密钥
HUNYUAN_SECRET_ID=AKIDxxxxxxxx（你的SecretId）
HUNYUAN_SECRET_KEY=xxxxxxxx（你的SecretKey）
```

---

## 🎯 第三步：开通云开发（1分钟）

### 1. 构建小程序

```bash
pnpm build:weapp
```

### 2. 打开微信开发者工具

- 导入项目
- 目录选择：`dist/`
- AppID：使用测试号或你的 AppID

### 3. 开通云开发

- 点击工具栏"云开发"按钮
- 点击"开通"
- 选择"基础版 1"（免费）
- 创建环境，记录**环境 ID**

### 4. 更新环境 ID

修改 `.env.local`：

```bash
TARO_APP_CLOUD_ENV_ID=你的环境ID
```

重新构建：

```bash
pnpm build:weapp
```

---

## 🎯 第四步：配置云函数（1分钟）

### 1. 配置环境变量

在微信开发者工具中：

1. 点击"云开发"
2. 进入"云函数" → "chat" → "配置"
3. 添加环境变量：

```
AI_PROVIDER=hunyuan
HUNYUAN_SECRET_ID=你的SecretId
HUNYUAN_SECRET_KEY=你的SecretKey
```

### 2. 创建数据库

在云开发控制台：

1. 进入"数据库"
2. 创建集合：`conversations`

### 3. 部署云函数

在微信开发者工具中：

1. 右键点击 `cloudfunctions/chat`
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成（约 30 秒）

---

## 🎯 第五步：测试运行（搞定！）

### 1. 预览小程序

在微信开发者工具中点击"预览"，用手机扫码

### 2. 测试聊天

发送一条消息："你好"

### 3. 查看日志

云开发控制台 → 云函数 → chat → 日志

应该能看到 AI 的回复！

---

## 🎉 完成！

现在你的小程序已经可以运行了，并且使用腾讯混元 AI 的免费额度（每月 100 万 tokens）！

---

## ❓ 遇到问题？

### 问题 1：云开发开通失败

**解决**：确保你的小程序 AppID 是正确的，或使用测试号

### 问题 2：云函数部署失败

**解决**：
1. 检查 `cloudfunctions/chat` 目录是否存在
2. 检查 `project.config.json` 中的 `cloudfunctionRoot` 配置

### 问题 3：聊天没反应

**解决**：
1. 查看云函数日志
2. 确认环境变量是否正确
3. 确认数据库集合是否创建

### 问题 4：提示"invalid url"

**解决**：这个问题已经修复，云函数版本不会出现此问题

---

## 📊 免费额度说明

腾讯混元 AI 免费额度：

- ✅ 每月 100 万 tokens
- ✅ 约 2000 条对话
- ✅ 完全免费

查看使用量：
https://console.cloud.tencent.com/hunyuan

---

## 🔄 后续步骤

### 上线小程序

1. 在微信公众平台提交审核
2. 审核通过后发布
3. 用户可以使用

### 监控使用量

定期查看：
- API 调用量
- tokens 使用情况
- 费用情况

---

## 📞 需要帮助？

查看详细文档：
- `README_CLOUD_FUNCTION.md` - 完整文档
- `HUNYUAN_AI_CONFIG.md` - 混元 AI 配置
- `CLOUD_FUNCTION_SETUP.md` - 云函数配置

祝使用愉快！🎉

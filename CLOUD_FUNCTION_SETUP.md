# 云函数配置文件示例

## 配置步骤

### 1. 微信开发者工具配置

在微信开发者工具中：

1. 点击右上角"详情"
2. 选择"本地设置"
3. 确认勾选：
   - ✅ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书（开发环境）

### 2. 云开发环境配置

#### 步骤 1：开通云开发

1. 在微信开发者工具中，点击"云开发"按钮
2. 或者登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
3. 点击"开通"（首次使用）

#### 步骤 2：获取环境 ID

在云开发控制台中：
1. 进入"设置" → "环境设置"
2. 复制"环境 ID"
3. 粘贴到 `.env.local` 文件中：
   ```bash
   TARO_APP_CLOUD_ENV_ID=你的环境ID
   ```

### 3. 云函数环境变量配置

在云开发控制台中：

1. 进入"云函数" → "chat"
2. 点击"配置" → "环境变量"
3. 添加以下环境变量：

#### codingplan API 配置

```
CODINGPLAN_API_URL=https://api.codingplan.com/v1
CODINGPLAN_API_KEY=你的_API_KEY
CODINGPLAN_MODEL=gpt-4
AI_PROVIDER=codingplan
```

#### 混元 AI 配置（预留）

```
HUNYUAN_API_URL=https://hunyuan.tencentcloudapi.com
HUNYUAN_SECRET_ID=你的_SECRET_ID
HUNYUAN_SECRET_KEY=你的_SECRET_KEY
HUNYUAN_MODEL=hunyuan-lite
AI_PROVIDER=hunyuan
```

### 4. 数据库集合配置

在云开发控制台中：

1. 进入"数据库"
2. 创建集合 `conversations`
3. 点击"添加记录"，无需添加字段

集合权限设置为：
```
读权限：所有用户可读
写权限：仅创建者可写
```

---

## 常见配置问题

### Q1：云函数环境变量不生效？

**解决方案：**
1. 确认环境变量配置在正确的云函数中
2. 配置后需要重新部署云函数
3. 检查环境变量名称是否正确（区分大小写）

### Q2：云函数超时？

**解决方案：**
1. 在云函数配置中，将超时时间设置为最大（60秒）
2. 优化云函数代码逻辑
3. 考虑使用异步处理

### Q3：数据库读写失败？

**解决方案：**
1. 检查数据库权限设置
2. 确认集合名称是否正确
3. 查看数据库日志

---

## 配置检查清单

- [ ] 微信开发者工具已配置
- [ ] 云开发环境已开通
- [ ] 环境 ID 已配置到 `.env.local`
- [ ] 云函数环境变量已配置
- [ ] 数据库集合已创建
- [ ] 云函数已部署成功
- [ ] 小程序可以正常调用云函数

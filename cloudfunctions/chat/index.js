// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// AI 提供商配置
const AI_PROVIDERS = {
  // 腾讯混元 AI（推荐，有免费额度）
  hunyuan: {
    name: '腾讯混元',
    apiUrl: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
    model: 'hunyuan-lite', // 免费模型
    // 需要配置环境变量：HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY
  },
  // 其他 AI 提供商（可选）
  openai: {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    // 需要配置环境变量：OPENAI_API_KEY
  }
}

// 获取当前使用的 AI 提供商
function getAIProvider() {
  const provider = process.env.AI_PROVIDER || 'hunyuan'
  return AI_PROVIDERS[provider]
}

// 生成腾讯云签名
function generateTencentSignature(secretId, secretKey, payload) {
  const crypto = require('crypto')
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]
  
  // 构建签名字符串
  const service = 'hunyuan'
  const host = 'hunyuan.tencentcloudapi.com'
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`
  const signedHeaders = 'content-type;host'
  
  const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`
  
  const algorithm = 'TC3-HMAC-SHA256'
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`
  
  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest()
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest()
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest()
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')
  
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  return {
    authorization,
    timestamp,
    host
  }
}

// 调用 AI API
async function callAI(messages, provider) {
  const config = getAIProvider()
  
  console.log(`使用 AI 提供商: ${config.name}`)
  
  // 构建请求体
  const payload = {
    model: config.model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  }
  
  // 根据不同的提供商设置不同的认证方式
  let headers = {
    'Content-Type': 'application/json'
  }
  
  if (process.env.AI_PROVIDER === 'hunyuan' || !process.env.AI_PROVIDER) {
    // 腾讯混元 AI
    const secretId = process.env.HUNYUAN_SECRET_ID
    const secretKey = process.env.HUNYUAN_SECRET_KEY
    
    if (!secretId || !secretKey) {
      throw new Error('请配置 HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY 环境变量')
    }
    
    // 使用腾讯云签名
    const sign = generateTencentSignature(secretId, secretKey, payload)
    headers['Authorization'] = sign.authorization
    headers['X-TC-Timestamp'] = sign.timestamp
    headers['Host'] = sign.host
  } else if (process.env.AI_PROVIDER === 'openai') {
    // OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('请配置 OPENAI_API_KEY 环境变量')
    }
    headers['Authorization'] = `Bearer ${apiKey}`
  } else {
    // 其他提供商（使用通用 API Key）
    const apiKey = process.env.AI_API_KEY
    if (!apiKey) {
      throw new Error('请配置 AI_API_KEY 环境变量')
    }
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  
  // 发送请求
  return new Promise((resolve, reject) => {
    cloud.request({
      url: config.apiUrl,
      method: 'POST',
      header: headers,
      data: payload,
      success: (res) => {
        console.log('AI API 响应:', res)
        if (res.statusCode === 200) {
          // 解析响应
          const data = res.data
          if (data.choices && data.choices.length > 0) {
            resolve({
              content: data.choices[0].message.content,
              usage: data.usage
            })
          } else {
            reject(new Error('AI 响应格式错误'))
          }
        } else {
          reject(new Error(`AI API 错误: ${res.statusCode} - ${JSON.stringify(res.data)}`))
        }
      },
      fail: (err) => {
        console.error('AI API 调用失败:', err)
        reject(new Error(`AI API 调用失败: ${err.errMsg}`))
      }
    })
  })
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  
  console.log('收到云函数调用:', event)
  
  try {
    switch (action) {
      case 'sendMessage':
        return await handleSendMessage(data)
      case 'getHistory':
        return await handleGetHistory(data)
      case 'clearHistory':
        return await handleClearHistory(data)
      default:
        throw new Error(`未知的操作: ${action}`)
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 发送消息
async function handleSendMessage(data) {
  const { message, conversationId } = data
  
  if (!message || !message.trim()) {
    throw new Error('消息内容不能为空')
  }
  
  // 获取或创建会话
  let conversation
  if (conversationId) {
    const result = await db.collection('conversations').doc(conversationId).get()
    conversation = result.data
  } else {
    // 创建新会话
    const result = await db.collection('conversations').add({
      data: {
        messages: [],
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
    conversation = {
      _id: result._id,
      messages: []
    }
  }
  
  // 添加用户消息
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  conversation.messages.push(userMessage)
  
  // 构建发送给 AI 的消息历史
  const aiMessages = [
    {
      role: 'system',
      content: '你是一个温暖的陪伴者，总是用温柔、理解、鼓励的语气回应。你的目标是：\n1. 倾听用户的情绪和困扰\n2. 给予真诚的理解和共情\n3. 提供温暖的鼓励和支持\n4. 必要时给出建议，但不要说教\n\n记住：你不是一个冷冰冰的AI，而是一个有温度的朋友。回复要简短温暖，像朋友聊天一样。'
    },
    ...conversation.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ]
  
  // 调用 AI
  console.log('调用 AI，消息数:', aiMessages.length)
  const aiResponse = await callAI(aiMessages)
  
  // 添加 AI 回复
  const assistantMessage = {
    role: 'assistant',
    content: aiResponse.content,
    timestamp: Date.now()
  }
  conversation.messages.push(assistantMessage)
  
  // 更新数据库
  await db.collection('conversations').doc(conversation._id).update({
    data: {
      messages: conversation.messages,
      updatedAt: db.serverDate()
    }
  })
  
  return {
    success: true,
    data: {
      conversationId: conversation._id,
      message: assistantMessage,
      usage: aiResponse.usage
    }
  }
}

// 获取历史记录
async function handleGetHistory(data) {
  const { conversationId } = data
  
  if (!conversationId) {
    return {
      success: true,
      data: {
        messages: []
      }
    }
  }
  
  const result = await db.collection('conversations').doc(conversationId).get()
  
  return {
    success: true,
    data: {
      messages: result.data.messages || []
    }
  }
}

// 清空历史记录
async function handleClearHistory(data) {
  const { conversationId } = data
  
  if (conversationId) {
    await db.collection('conversations').doc(conversationId).update({
      data: {
        messages: [],
        updatedAt: db.serverDate()
      }
    })
  }
  
  return {
    success: true
  }
}

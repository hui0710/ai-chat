const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const { SYSTEM_PROMPT, AI_PROVIDERS, DEFAULT_PROVIDER, AI_REQUEST_CONFIG } = require('../../config/ai.config')

function getAIProvider() {
  const provider = process.env.AI_PROVIDER || DEFAULT_PROVIDER
  if (!AI_PROVIDERS[provider]) {
    throw new Error('不支持的 AI 提供商: ' + provider)
  }
  return AI_PROVIDERS[provider]
}

// 【修复】重写腾讯标准签名函数 (TC3-HMAC-SHA256)
function generateTencentSignature(secretId, secretKey, payload, host) {
  const crypto = require('crypto')
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]

  const service = 'hunyuan'
  const action = 'ChatCompletions'
  const version = '2023-09-01'
  
  // 规范化请求串
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'

  const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`

  const algorithm = 'TC3-HMAC-SHA256'
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

  const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest()
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest()
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest()
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex')

  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return { authorization, timestamp, host, action, version }
}

function callHTTPS(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const data = JSON.stringify(payload)
    
    // 修复腾讯云内网证书问题，跳过证书校验
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    })

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname, // 官方标准接口 Path 通常为 /
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(data)
      },
      agent: httpsAgent
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) })
        } catch (e) {
          reject(new Error('JSON 解析失败'))
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  })
}

async function callAI(messages) {
  const config = getAIProvider()
  const urlObj = new URL(config.apiUrl)

  // 【修复】构造符合腾讯标准 API 格式的请求体 (注意首字母大写)
  const payload = {
    Model: config.model,
    Messages: messages.map(m => ({
      Role: m.role === 'system' || m.role === 'user' ? m.role : 'user', // 确保 role 格式正确
      Content: m.content
    })),
    TopP: AI_REQUEST_CONFIG.topP,
    Temperature: AI_REQUEST_CONFIG.temperature
  }

  let headers = { 'Content-Type': 'application/json' }

  // 腾讯混元标准签名逻辑
  const secretId = process.env.HUNYUAN_SECRET_ID
  const secretKey = process.env.HUNYUAN_SECRET_KEY

  if (!secretId || !secretKey) {
     throw new Error('缺少环境变量 HUNYUAN_SECRET_ID/KEY')
  }

  // 生成签名，传入正确的 Host
  const sign = generateTencentSignature(secretId, secretKey, payload, urlObj.hostname)
  
  headers['Authorization'] = sign.authorization
  headers['X-TC-Timestamp'] = sign.timestamp.toString()
  headers['X-TC-Action'] = sign.action
  headers['X-TC-Version'] = sign.version

  const response = await callHTTPS(config.apiUrl, headers, payload)
  
  // 解析腾讯 API 返回的结果
  if (response.statusCode === 200 && response.data && response.data.Response) {
    const resp = response.data.Response
    // 混元 API 结果通常在 Response.Choices[0].Message.Content
    if (resp.ErrorMsg) {
      throw new Error('混元 API 报错: ' + resp.ErrorMsg)
    }
    if (resp.Choices && resp.Choices.length > 0) {
      return { content: resp.Choices[0].Message.Content }
    } else {
      throw new Error('AI 返回数据格式异常: ' + JSON.stringify(resp))
    }
  } else {
    throw new Error('AI API 错误 (Status ' + response.statusCode + '): ' + JSON.stringify(response.data))
  }
}

exports.main = async (event, context) => {
  const { action, data } = event
  try {
    switch (action) {
      case 'sendMessage':
      case 'chat':
        return await handleChat(data)
      case 'getHistory':
        return { success: true, data: { messages: [] } }
      case 'clearHistory':
        return { success: true }
      case 'getOpenid':
        // 返回当前用户openid，用于前端情绪偏好缓存
        return { success: true, data: { openid: context.OPENID || '' } }
      default:
        throw new Error(`未知的操作: ${action}`)
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/** 用户情绪偏好缓存（云函数内存缓存，实际生产建议用数据库） */
const userEmotionCache = new Map()

/** 解析用户情绪标签（简易版，与前端 emotion-engine.ts 对应） */
function detectEmotionTag(message) {
  const lowerMsg = message.toLowerCase()
  const emotionKeywords = {
    sad: ['委屈', '难过', '伤心', '想哭', '心酸', '难受', '痛苦'],
    tired: ['累', '疲惫', '好累', '身心俱疲', '撑不住'],
    anxious: ['焦虑', '内耗', '纠结', '胡思乱想', '放不下', '想太多', '烦'],
    insomnia: ['睡不着', '失眠', '夜深', '熬夜'],
    work: ['工作', '加班', '老板', '同事', '职场', '上班', 'kpi', '绩效'],
    love: ['感情', '分手', '失恋', '喜欢', '爱', '恋爱', '前任', '暧昧'],
    happy: ['开心', '高兴', '快乐', '喜悦', '幸福', '棒', '赞', '太好了'],
    lost: ['迷茫', '无助', '不知道', '怎么办', '未来', '方向', '困惑'],
    relief: ['放下', '释怀', '想开', '看淡', '算了', '没关系'],
    silence: ['不想说', '静静', '安静', '沉默', '发呆', '不知道说什么'],
    encourage: ['加油', '坚持', '努力', '撑住', '不放弃', '打气'],
  }

  for (const [tag, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        return tag
      }
    }
  }
  return null
}

/** 获取用户偏好的安慰风格 */
function getUserComfortStyle(openid) {
  if (!openid) return null
  return userEmotionCache.get(openid) || null
}

/** 更新用户情绪偏好 */
function updateUserEmotionCache(openid, emotionTag) {
  if (!openid || !emotionTag) return
  const current = userEmotionCache.get(openid) || { tags: [], count: 0 }
  current.tags.push(emotionTag)
  current.count += 1
  // 只保留最近20次记录
  if (current.tags.length > 20) current.tags.shift()
  userEmotionCache.set(openid, current)
}

async function handleChat(data) {
  const { message, history, openid } = data
  if (!message || !message.trim()) throw new Error('消息不能为空')

  // 1. 识别用户情绪标签
  const emotionTag = detectEmotionTag(message)

  // 2. 更新用户情绪偏好缓存
  if (emotionTag && openid) {
    updateUserEmotionCache(openid, emotionTag)
  }

  // 3. 获取用户偏好风格，注入提示词
  const userStyle = getUserComfortStyle(openid)
  let enhancedSystemPrompt = SYSTEM_PROMPT
  if (userStyle && userStyle.count >= 3) {
    // 用户有3次以上记录，锁定专属安慰风格
    const recentTags = userStyle.tags.slice(-5)
    const tagCount = {}
    recentTags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
    const dominantTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    if (dominantTag) {
      enhancedSystemPrompt += `\n\n【用户专属适配】该用户近期主要情绪倾向为「${dominantTag}」，请自动适配对应的安慰风格，保持长期一致性。`
    }
  }

  const aiMessages = [
    { role: 'system', content: enhancedSystemPrompt },
    ...(history || []).slice(-6),
    { role: 'user', content: message }
  ]

  const aiResponse = await callAI(aiMessages)
  return { success: true, data: { content: aiResponse.content, emotionTag } }
}

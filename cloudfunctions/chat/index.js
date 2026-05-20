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
      default:
        throw new Error(`未知的操作: ${action}`)
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleChat(data) {
  const { message, history } = data
  if (!message || !message.trim()) throw new Error('消息不能为空')

  const aiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(history || []).slice(-6),
    { role: 'user', content: message }
  ]

  const aiResponse = await callAI(aiMessages)
  return { success: true, data: { content: aiResponse.content } }
}

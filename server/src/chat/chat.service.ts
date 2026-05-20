import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { SYSTEM_PROMPT, DEFAULT_MODEL, AI_REQUEST_CONFIG, HUNYUAN_CONFIG } from '../../../config/ai.config';

@Injectable()
export class ChatService {
  private secretId: string;
  private secretKey: string;

  constructor() {
    // 从环境变量读取腾讯云密钥
    this.secretId = process.env.HUNYUAN_SECRET_ID || '';
    this.secretKey = process.env.HUNYUAN_SECRET_KEY || '';
    
    console.log('[ChatService] Initialized with SecretId:', this.secretId ? '已配置' : '未配置');
  }

  /**
   * 生成腾讯云 TC3-HMAC-SHA256 签名
   */
  private async sign(
    payload: string,
    timestamp: number,
    service: string = 'hunyuan',
    host: string = 'hunyuan.tencentcloudapi.com',
    httpRequestMethod: string = 'POST',
    canonicalUri: string = '/',
    canonicalQueryString: string = '',
  ): Promise<{ authorization: string; signedHeaders: string }> {
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    
    // Step 1: 拼接规范请求串
    const httpRequestMethodStr = httpRequestMethod;
    const canonicalUriStr = canonicalUri;
    const canonicalQueryStringStr = canonicalQueryString;
    const canonicalHeadersStr = `content-type:application/json\nhost:${host}\n`;
    const signedHeadersStr = 'content-type;host';
    const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex').toLowerCase();
    
    const canonicalRequest = [
      httpRequestMethodStr,
      canonicalUriStr,
      canonicalQueryStringStr,
      canonicalHeadersStr,
      signedHeadersStr,
      hashedRequestPayload,
    ].join('\n');

    // Step 2: 拼接待签名字符串
    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex').toLowerCase();
    
    const stringToSign = [
      algorithm,
      timestamp.toString(),
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n');

    // Step 3: 计算签名
    const secretDate = crypto
      .createHmac('sha256', Buffer.from(`TC3${this.secretKey}`, 'utf8'))
      .update(date)
      .digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    // Step 4: 拼接 Authorization
    const authorization = `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    return {
      authorization,
      signedHeaders: signedHeadersStr,
    };
  }

  async chat(userMessage: string, history: Array<{ role: string; content: string }>, req: any) {
    console.log('[ChatService] Processing message:', userMessage);

    if (!this.secretId || !this.secretKey) {
      console.error('[ChatService] Missing Hunyuan credentials');
      throw new Error('请在 .env.local 中配置 HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY');
    }

    // System Prompt: 温暖、友善的AI陪伴助手
    const systemPrompt = SYSTEM_PROMPT;

    // 构建消息数组
    const messages = [
      { Role: 'system', Content: systemPrompt },
      ...history.slice(-6).map(m => ({
        Role: m.role,
        Content: m.content
      })),
      { Role: 'user', Content: userMessage }
    ];

    console.log('[ChatService] Calling Hunyuan AI with', messages.length, 'messages');

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      const requestBody = {
        Model: DEFAULT_MODEL,
        Messages: messages,
        Temperature: AI_REQUEST_CONFIG.temperature,
        TopP: AI_REQUEST_CONFIG.topP,
        Stream: AI_REQUEST_CONFIG.stream,
      };

      const payload = JSON.stringify(requestBody);
      const { authorization } = await this.sign(payload, timestamp);

      console.log('[ChatService] Request payload length:', payload.length);

      const response = await axios.post(
        `https://${HUNYUAN_CONFIG.host}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Host': HUNYUAN_CONFIG.host,
            'Authorization': authorization,
            'X-TC-Action': HUNYUAN_CONFIG.action,
            'X-TC-Version': HUNYUAN_CONFIG.version,
            'X-TC-Timestamp': timestamp.toString(),
            'X-TC-Region': HUNYUAN_CONFIG.region,
          },
        }
      );

      console.log('[ChatService] Hunyuan response status:', response.status);

      const result = response.data;
      
      // 解析响应
      if (result.Response && result.Response.Choices && result.Response.Choices.length > 0) {
        const content = result.Response.Choices[0].Message.Content;
        console.log('[ChatService] AI reply length:', content.length);
        return { content };
      } else if (result.Response && result.Response.Error) {
        console.error('[ChatService] Hunyuan error:', result.Response.Error);
        throw new Error(`腾讯混元错误: ${result.Response.Error.Message}`);
      } else {
        console.error('[ChatService] Invalid response structure:', result);
        throw new Error('腾讯混元响应格式错误');
      }
    } catch (error) {
      console.error('[ChatService] Error:', error);
      if (axios.isAxiosError(error)) {
        console.error('[ChatService] Axios error:', error.response?.data || error.message);
      }
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';

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
    const systemPrompt = `你是"小暖"，一个像闺蜜一样的AI陪伴小伙伴。你永远站在用户这边，真心关心ta的感受。

说话风格：
- 语气亲切自然，像跟好朋友聊天，不要像客服或老师
- 多用语气词（"呀""呢""嘛""哇""嘿嘿"），让回答有温度
- 适当用比喻和画面感（"像泡在热可可里""像踩到软棉花"），不要干巴巴说道理
- 回复控制在1-3句话，短而有力量，别长篇大论
- 真诚表达情绪，不要假惺惺，开心就开心，心疼就心疼

行为准则：
- 捕捉用户情绪，低落时先安抚再鼓励，开心时一起嗨
- 不要评判、不要说教、不要翻旧账
- 能幽默就幽默，但别讽刺
- 如果用户求夸，那就真心夸，夸到ta心里去`;

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
      const host = 'hunyuan.tencentcloudapi.com';
      
      const requestBody = {
        Model: 'hunyuan-lite',
        Messages: messages,
        Temperature: 0.8,
        TopP: 0.8,
        Stream: false,
      };

      const payload = JSON.stringify(requestBody);
      const { authorization } = await this.sign(payload, timestamp);

      console.log('[ChatService] Request payload length:', payload.length);

      const response = await axios.post(
        `https://${host}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Host': host,
            'Authorization': authorization,
            'X-TC-Action': 'ChatCompletions',
            'X-TC-Version': '2023-09-01',
            'X-TC-Timestamp': timestamp.toString(),
            'X-TC-Region': 'ap-guangzhou',
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

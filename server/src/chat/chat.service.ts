import { Injectable } from '@nestjs/common';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';

@Injectable()
export class ChatService {
  private client: LLMClient;

  constructor() {
    // 初始化 LLM Client
    const config = new Config();
    // 不传递 customHeaders，在调用时传递
    this.client = new LLMClient(config);
  }

  async chat(userMessage: string, history: Array<{ role: string; content: string }>, req: any) {
    console.log('[ChatService] Processing message:', userMessage);

    // 提取请求头用于追踪
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    console.log('[ChatService] Extracted headers:', Object.keys(customHeaders).length);

    // System Prompt: 温暖、友善的AI陪伴助手
    const systemPrompt = `你是一位温暖、友善、善解人意的AI陪伴助手。`;

    // 构建 Message 数组
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    console.log('[ChatService] Calling LLM with', messages.length, 'messages');
    console.log('[ChatService] Message 0 role:', messages[0].role, 'type:', typeof messages[0].role);
    console.log('[ChatService] Message 1 role:', messages[1].role, 'type:', typeof messages[1].role);

    try {
      // 创建带 customHeaders 的新 client
      const clientWithHeaders = new LLMClient(new Config(), customHeaders);

      const response = await clientWithHeaders.invoke(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.8
      });

      console.log('[ChatService] LLM response received, content length:', response.content?.length || 0);

      return {
        content: response.content
      };
    } catch (error) {
      console.error('[ChatService] LLM error:', error);
      console.error('[ChatService] Error name:', (error as Error).name);
      console.error('[ChatService] Error message:', (error as Error).message);
      if ((error as Error).stack) {
        console.error('[ChatService] Error stack:', (error as Error).stack?.split('\n').slice(0, 5).join('\n'));
      }
      throw error;
    }
  }
}

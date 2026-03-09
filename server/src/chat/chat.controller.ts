import { Controller, Post, Body, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequest, @Req() req: any) {
    console.log('[Chat API] Request received:', {
      message: body.message,
      historyLength: body.history?.length || 0
    });

    const result = await this.chatService.chat(body.message, body.history || [], req);

    console.log('[Chat API] Response sent:', {
      contentLength: result.content?.length || 0
    });

    return {
      code: 200,
      msg: 'success',
      data: result
    };
  }
}

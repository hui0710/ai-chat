import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import axios from "axios";
import {
  SYSTEM_PROMPT,
  AI_REQUEST_CONFIG,
  HUNYUAN_CONFIG,
  MEMORY_EXTRACTION_PROMPT,
  MEMORY_INJECTION_TEMPLATE,
  AI_PROVIDER_MAP,
  DEFAULT_AI_PROVIDER,
  type AIProviderType,
} from "../../../config/ai.config";
import { MemoryService } from "../memory/memory.service";

@Injectable()
export class ChatService {
  private secretId: string;
  private secretKey: string;

  constructor(private readonly memoryService: MemoryService) {
    this.secretId = process.env.HUNYUAN_SECRET_ID || "";
    this.secretKey = process.env.HUNYUAN_SECRET_KEY || "";
    console.log(
      "[ChatService] Initialized with SecretId:",
      this.secretId ? "已配置" : "未配置",
    );
  }

  private async sign(
    payload: string,
    timestamp: number,
    service: string = "hunyuan",
    host: string = "hunyuan.tencentcloudapi.com",
    httpRequestMethod: string = "POST",
    canonicalUri: string = "/",
    canonicalQueryString: string = "",
  ): Promise<{ authorization: string; signedHeaders: string }> {
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    const canonicalHeadersStr = `content-type:application/json\nhost:${host}\n`;
    const signedHeadersStr = "content-type;host";
    const hashedRequestPayload = crypto
      .createHash("sha256")
      .update(payload)
      .digest("hex")
      .toLowerCase();

    const canonicalRequest = [
      httpRequestMethod,
      canonicalUri,
      canonicalQueryString,
      canonicalHeadersStr,
      signedHeadersStr,
      hashedRequestPayload,
    ].join("\n");

    const algorithm = "TC3-HMAC-SHA256";
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto
      .createHash("sha256")
      .update(canonicalRequest)
      .digest("hex")
      .toLowerCase();
    const stringToSign = [
      algorithm,
      timestamp.toString(),
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");

    const secretDate = crypto
      .createHmac("sha256", Buffer.from(`TC3${this.secretKey}`, "utf8"))
      .update(date)
      .digest();
    const secretService = crypto
      .createHmac("sha256", secretDate)
      .update(service)
      .digest();
    const secretSigning = crypto
      .createHmac("sha256", secretService)
      .update("tc3_request")
      .digest();
    const signature = crypto
      .createHmac("sha256", secretSigning)
      .update(stringToSign)
      .digest("hex");

    const authorization = `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
    return { authorization, signedHeaders: signedHeadersStr };
  }

  /** 构建记忆注入 prompt */
  private buildMemoryPrompt(userId: string): string {
    const summary = this.memoryService.getMemorySummary(userId);
    if (!summary) return "";

    const anniv = this.memoryService.getAnniversary(userId);
    let annivHint = "";
    if (anniv?.isAnniversary) {
      annivHint = `\n🎉 今天是你们认识第${anniv.days}天的纪念日，可以适当提及！`;
    }

    return (
      MEMORY_INJECTION_TEMPLATE.replace(
        "{days_since_first}",
        String(summary.daysSinceFirst),
      )
        .replace("{total_chats}", String(summary.totalChats))
        .replace("{facts}", summary.facts.join("、") || "暂无")
        .replace(
          "{recent_emotions}",
          summary.recentEmotions.join("、") || "暂无",
        )
        .replace("{preferences}", summary.preferences.join("、") || "暂无")
        .replace("{recent_events}", summary.recentEvents.join("、") || "暂无")
        .replace("{last_chat_time}", summary.lastChatTime)
        .replace("{last_mood}", summary.lastMood) + annivHint
    );
  }

  async chat(
    userMessage: string,
    history: Array<{ role: string; content: string }>,
    req: any,
    userId?: string,
    provider?: AIProviderType,
  ) {
    console.log("[ChatService] Processing message:", userMessage);

    const aiProvider =
      AI_PROVIDER_MAP[provider || DEFAULT_AI_PROVIDER] ||
      AI_PROVIDER_MAP.hunyuan;

    // 构建增强的 system prompt（注入记忆）
    let systemPrompt = SYSTEM_PROMPT;
    if (userId) {
      const memoryPrompt = this.buildMemoryPrompt(userId);
      if (memoryPrompt) {
        systemPrompt += memoryPrompt;
      }
    }

    const maxHistory = aiProvider.maxHistory || 6;
    const messages = [
      { role: "system", content: systemPrompt },
      ...history
        .slice(-maxHistory)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    console.log(
      "[ChatService] Calling",
      aiProvider.name,
      "with",
      messages.length,
      "messages",
    );

    try {
      const content = await this.callAIProvider(aiProvider, messages);

      // 异步提取记忆（不阻塞用户回复）
      if (userId) {
        this.extractAndSaveMemory(userId, messages, content).catch((e) => {
          console.error("[ChatService] Memory extraction failed:", e);
        });
      }

      return { content };
    } catch (error) {
      console.error("[ChatService] Error:", error);
      if (axios.isAxiosError(error)) {
        console.error(
          "[ChatService] Axios error:",
          error.response?.data || error.message,
        );
      }
      throw error;
    }
  }

  private async callAIProvider(
    provider: {
      name: string;
      apiUrl: string;
      model: string;
      useTencentSign: boolean;
      apiKeyEnv?: string;
    },
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (provider.useTencentSign) {
      return this.callHunyuan(messages);
    }
    return this.callOpenAICompatible(provider, messages);
  }

  private async callHunyuan(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (!this.secretId || !this.secretKey) {
      throw new Error(
        "请在 .env.local 中配置 HUNYUAN_SECRET_ID 和 HUNYUAN_SECRET_KEY",
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const requestBody = {
      Model: AI_PROVIDER_MAP.hunyuan.model,
      Messages: messages.map((m) => ({
        Role:
          m.role === "system"
            ? "system"
            : m.role === "user"
              ? "user"
              : "assistant",
        Content: m.content,
      })),
      Temperature: AI_REQUEST_CONFIG.temperature,
      TopP: AI_REQUEST_CONFIG.topP,
      Stream: AI_REQUEST_CONFIG.stream,
    };

    const payload = JSON.stringify(requestBody);
    const { authorization } = await this.sign(payload, timestamp);

    const response = await axios.post(
      `https://${HUNYUAN_CONFIG.host}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Host: HUNYUAN_CONFIG.host,
          Authorization: authorization,
          "X-TC-Action": HUNYUAN_CONFIG.action,
          "X-TC-Version": HUNYUAN_CONFIG.version,
          "X-TC-Timestamp": timestamp.toString(),
          "X-TC-Region": HUNYUAN_CONFIG.region,
        },
      },
    );

    const result = response.data;
    if (result.Response?.Choices?.length > 0) {
      return result.Response.Choices[0].Message.Content;
    } else if (result.Response?.Error) {
      throw new Error(`腾讯混元错误: ${result.Response.Error.Message}`);
    }
    throw new Error("腾讯混元响应格式错误");
  }

  private async callOpenAICompatible(
    provider: { apiUrl: string; model: string; apiKeyEnv?: string },
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const apiKey = provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : "";
    if (!apiKey) {
      throw new Error(`缺少环境变量 ${provider.apiKeyEnv}`);
    }

    const response = await axios.post(
      provider.apiUrl,
      {
        model: provider.model,
        messages,
        temperature: AI_REQUEST_CONFIG.temperature,
        top_p: AI_REQUEST_CONFIG.topP,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      },
    );

    if (response.data?.choices?.length > 0) {
      return response.data.choices[0].message.content;
    }
    throw new Error(`${provider.model} 响应格式错误`);
  }

  /** 异步提取记忆并保存 */
  private async extractAndSaveMemory(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    aiReply: string,
  ): Promise<void> {
    try {
      const conversationText = [
        ...messages
          .filter((m) => m.role !== "system")
          .map((m) => `${m.role}: ${m.content}`),
        `assistant: ${aiReply}`,
      ].join("\n");

      const prompt = MEMORY_EXTRACTION_PROMPT.replace(
        "{conversation}",
        conversationText,
      );
      const extractionMessages = [
        { role: "system", content: prompt },
        { role: "user", content: "请提取以上对话中的用户信息。" },
      ];

      const extractionJson = await this.callHunyuan(extractionMessages);
      const jsonMatch = extractionJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extraction = JSON.parse(jsonMatch[0]);
        this.memoryService.updateProfile(userId, extraction);
        console.log("[ChatService] Memory extracted for user:", userId);
      }
    } catch (e) {
      console.error("[ChatService] Memory extraction error:", e);
    }
  }
}

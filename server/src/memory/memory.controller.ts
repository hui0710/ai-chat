import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get("profile")
  async getProfile(@Query("userId") userId: string) {
    const summary = this.memoryService.getMemorySummary(userId);
    return { code: 200, msg: "success", data: summary };
  }

  @Post("update")
  async updateProfile(
    @Body()
    body: {
      userId: string;
      extraction: {
        facts?: string[];
        emotions?: string[];
        preferences?: string[];
        events?: string[];
        mood_score?: number;
      };
    },
  ) {
    this.memoryService.updateProfile(body.userId, body.extraction);
    return { code: 200, msg: "success", data: null };
  }

  @Get("mood-history")
  async getMoodHistory(
    @Query("userId") userId: string,
    @Query("days") days?: string,
  ) {
    const history = this.memoryService.getMoodHistory(
      userId,
      days ? parseInt(days) : 7,
    );
    return { code: 200, msg: "success", data: history };
  }

  @Get("anniversary")
  async getAnniversary(@Query("userId") userId: string) {
    const result = this.memoryService.getAnniversary(userId);
    return { code: 200, msg: "success", data: result };
  }
}

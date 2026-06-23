import { Module } from "@nestjs/common";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { ChatModule } from "@/chat/chat.module";
import { MemoryModule } from "@/memory/memory.module";

@Module({
  imports: [ChatModule, MemoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

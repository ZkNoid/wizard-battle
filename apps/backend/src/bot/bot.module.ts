import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotClientService } from './bot-client.service';

/**
 * @title Bot Module - AI Player Management
 * @notice NestJS module that provides bot players for matchmaking
 * @dev Handles bot lifecycle, AI logic, and WebSocket client simulation
 */
@Module({
  providers: [BotService, BotClientService],
  exports: [BotService, BotClientService],
})
export class BotModule {}

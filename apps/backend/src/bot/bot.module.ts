import { Module } from '@nestjs/common';
import { BotClientService } from './bot-client.service';

/**
 * @title Bot Module - AI Player Management
 * @notice NestJS module that provides bot players for matchmaking
 * @dev Handles bot lifecycle, AI logic, and WebSocket client simulation
 * @dev Each BotClient owns an IBotStrategy instance; default is MageBotStrategy
 */
@Module({
  providers: [BotClientService],
  exports: [BotClientService],
})
export class BotModule {}

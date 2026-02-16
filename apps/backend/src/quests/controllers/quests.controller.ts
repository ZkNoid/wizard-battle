import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { QuestsService } from '../services/quests.service';

@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  /**
   * Get quest progress for a user
   */
  @Get(':userId')
  async getUserQuests(@Param('userId') userId: string) {
    const status = await this.questsService.getQuestCompletionStatus(userId);
    if (!status) {
      // Create new user quest and return initial status
      await this.questsService.getOrCreateUserQuest(userId);
      return this.questsService.getQuestCompletionStatus(userId);
    }
    return status;
  }

  /**
   * Get leaderboard
   */
  @Get('leaderboard/top')
  async getLeaderboard() {
    return this.questsService.getLeaderboard(100);
  }

  /**
   * Track feedback submission (external tracking endpoint)
   */
  @Post(':userId/feedback')
  async trackFeedback(@Param('userId') userId: string) {
    await this.questsService.trackFeedbackSubmitted(userId);
    return { success: true, message: 'Feedback quest completed!' };
  }
}


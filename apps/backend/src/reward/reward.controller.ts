import { Body, Controller, Post } from '@nestjs/common';
import { RewardService } from './reward.service';

@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  // @Post('gold')
  // async rewardGold(@Body() body: { userId: string; amount: number }) {
  //   return this.rewardService.rewardGold(body.userId, body.amount);
  // }
}

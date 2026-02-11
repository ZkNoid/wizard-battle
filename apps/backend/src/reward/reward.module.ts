import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';

@Module({
  imports: [UserInventoryModule],
  controllers: [RewardController],
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}

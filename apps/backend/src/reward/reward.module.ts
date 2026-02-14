import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';
import { UserModule } from '../user/user.module';
import { QuestsModule } from '../quests/quests.module';

@Module({
  imports: [UserInventoryModule, UserModule, QuestsModule],
  controllers: [RewardController],
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}

import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserInventoryModule, UserModule],
  controllers: [RewardController],
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}

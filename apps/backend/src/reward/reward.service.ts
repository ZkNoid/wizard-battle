import { Injectable } from '@nestjs/common';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';

@Injectable()
export class RewardService {
  constructor(private readonly userInventoryService: UserInventoryService) {}

  async rewardGold(userId: string, amount: number) {
    const goldItem = await this.userInventoryService.addItem({
      userId,
      itemId: 'Gold',
      quantity: amount,
      acquiredFrom: 'reward',
    });

    return {
      success: true,
      itemId: goldItem.itemId,
      quantity: goldItem.quantity,
    };
  }
}

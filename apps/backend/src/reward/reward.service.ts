import { Injectable } from '@nestjs/common';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { IRandomItem } from '../../../common/types/gameplay.types';

@Injectable()
export class RewardService {
  constructor(private readonly userInventoryService: UserInventoryService) {}

  numberAndChanceToNumber = (n, q) => {
    let res = 0;
    for (let i = 0; i < n; i++) if (Math.random() < q) res++;
    return res;
  };

  chanceFunc = ({ itemId, quantity, chance }: IRandomItem) => ({
    itemId,
    quantity: this.numberAndChanceToNumber(quantity, chance),
  });

  async rewardItem(userId: string, amount: number, itemId: string) {
    const rewardItem = await this.userInventoryService.addItem({
      userId,
      itemId: itemId,
      quantity: amount,
      acquiredFrom: 'reward',
    });

    return {
      success: true,
      itemId: rewardItem.itemId,
      quantity: rewardItem.quantity,
    };
  }

  async rewardRandomItems(userId: string, rewards: IRandomItem[]) {
    const out = rewards.map(this.chanceFunc);
    let rewardItems: { itemId: string; quantity: number }[] = [];

    for (let item of out) {
      const rewardItem = await this.userInventoryService.addItem({
        userId,
        itemId: item.itemId,
        quantity: item.quantity,
        acquiredFrom: 'reward',
      });

      const resultItem = {
        itemId: rewardItem.itemId,
        quantity: rewardItem.quantity,
      };
      rewardItems.push(resultItem);
    }
    return {
      success: true,
      items: rewardItems,
    };
  }

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

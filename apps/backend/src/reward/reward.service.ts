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
      quantity: amount,
      total: rewardItem.quantity,
    };
  }

  async rewardRandomItems(userId: string, rewards: IRandomItem[]) {
    const out = rewards.map(this.chanceFunc);
    let rewardItems: { itemId: string; quantity: number; total: number }[] = [];

    for (let item of out) {
      const rewardItem = await this.userInventoryService.addItem({
        userId,
        itemId: item.itemId,
        quantity: item.quantity,
        acquiredFrom: 'reward',
      });

      const resultItem = {
        itemId: rewardItem.itemId,
        quantity: item.quantity,
        total: rewardItem.quantity,
      };
      rewardItems.push(resultItem);
    }
    return {
      success: true,
      items: rewardItems,
    };
  }

  // async rewardXP(
  //   winnerId: string,
  //   looserId: string,
  //   status: 'win' | 'draw' | 'even'
  // ) {
  //   const rewardItem = await this.user.addItem({
  //     userId,
  //     itemId: itemId,
  //     quantity: amount,
  //     acquiredFrom: 'reward',
  //   });

  //   return {
  //     success: true,
  //     itemId: rewardItem.itemId,
  //     quantity: amount,
  //     total: rewardItem.quantity,
  //   };
  // }
}

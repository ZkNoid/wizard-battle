import { Injectable } from '@nestjs/common';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { UserService } from '../user/user.service';
import { IRandomItem } from '../../../common/types/gameplay.types';

@Injectable()
export class RewardService {
  constructor(
    private readonly userInventoryService: UserInventoryService,
    private readonly userService: UserService
  ) {}

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
      if (item.quantity == 0) {
        continue;
      }
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

  async rewardXP(
    winnerId: string,
    looserId: string,
    status: 'win' | 'draw' | 'even'
  ) {
    let winnerXP = 0;
    let looserXP = 0;

    switch (status) {
      case 'win':
        winnerXP = 100;
        looserXP = 30;
        break;
      case 'draw':
        winnerXP = 30;
        looserXP = 30;
        break;
      case 'even':
        winnerXP = 50;
        looserXP = 50;
        break;
      default:
        winnerXP = 0;
        looserXP = 0;
    }

    await this.userService.addXP(winnerId, winnerXP);
    //await this.userService.addXP(looserId, looserXP);

    return {
      success: true,
      winnerXP: winnerXP,
      looserXP: looserXP,
    };
  }
}

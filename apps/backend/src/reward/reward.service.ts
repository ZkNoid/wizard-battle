import { Injectable } from '@nestjs/common';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { UserService } from '../user/user.service';
import { QuestsService } from '../quests/services/quests.service';
import { IRandomItem } from '../../../common/types/gameplay.types';

/**
 * XP thresholds for each level (same as frontend)
 */
const LEVELS_XP = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
  1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700,
  2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000,
  4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300,
  5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300, 6400, 6500, 6600,
  6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900,
  8000, 8100, 8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 9000, 9100, 9200,
  9300, 9400, 9500, 9600, 9700, 9800, 9900, 10000,
];

/**
 * Calculate level from XP
 */
const levelFromXp = (xp: number): number => {
  if (LEVELS_XP.length === 0 || xp < LEVELS_XP[0]!) return 1;
  for (let i = LEVELS_XP.length - 1; i >= 0; i--) {
    if (LEVELS_XP[i]! <= xp) {
      return i + 1;
    }
  }
  return 1;
};

@Injectable()
export class RewardService {
  constructor(
    private readonly userInventoryService: UserInventoryService,
    private readonly userService: UserService,
    private readonly questsService: QuestsService
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
    status: 'win' | 'draw' | 'even',
    winnerCharacter: string,
    looserCharacter: string
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

    // Winner
    const winnerBefore = await this.userService.findByAddress(winnerId);
    await this.userService.addXP(winnerId, winnerXP, winnerCharacter);
    const winnerAfter = await this.userService.findByAddress(winnerId); // Get winner updated XP after adding

    // Track level-based quests for winner
    if (winnerAfter) {
      const normalizeCharacter = (
        char: string
      ): 'mage' | 'archer' | 'duelist' => {
        const normalized = char?.toLowerCase() ?? 'mage';
        if (
          normalized === 'mage' ||
          normalized === 'archer' ||
          normalized === 'duelist'
        ) {
          return normalized;
        }
        return 'mage';
      };

      const wChar = normalizeCharacter(winnerCharacter);
      const newXp =
        wChar === 'mage'
          ? winnerAfter.mage_xp
          : wChar === 'archer'
            ? winnerAfter.archer_xp
            : winnerAfter.duelist_xp;
      const oldXp = winnerBefore
        ? wChar === 'mage'
          ? winnerBefore.mage_xp
          : wChar === 'archer'
            ? winnerBefore.archer_xp
            : winnerBefore.duelist_xp
        : 0;

      const newLevel = levelFromXp(newXp);
      const oldLevel = levelFromXp(oldXp);

      // Track wizard level if it changed
      if (newLevel > oldLevel) {
        try {
          await this.questsService.trackWizardLevel(winnerId, wChar, newLevel);
        } catch (error) {
          console.error('Failed to track wizard level quest:', error);
        }
      }
    }

    // Looser
    if (looserId && looserId != '0x0') {
      // incase looser is not passed, doe to giveup, timeout -> no rewards
      const looserBefore = await this.userService.findByAddress(looserId);
      await this.userService.addXP(looserId, looserXP, looserCharacter);
      const looserAfter = await this.userService.findByAddress(looserId); // Get winner updated XP after adding

      // Track level-based quests for loser
      if (looserAfter) {
        const normalizeCharacter = (
          char: string
        ): 'mage' | 'archer' | 'duelist' => {
          const normalized = char?.toLowerCase() ?? 'mage';
          if (
            normalized === 'mage' ||
            normalized === 'archer' ||
            normalized === 'duelist'
          ) {
            return normalized;
          }
          return 'mage';
        };

        const lChar = normalizeCharacter(looserCharacter);
        const newXp =
          lChar === 'mage'
            ? looserAfter.mage_xp
            : lChar === 'archer'
              ? looserAfter.archer_xp
              : looserAfter.duelist_xp;
        const oldXp = looserBefore
          ? lChar === 'mage'
            ? looserBefore.mage_xp
            : lChar === 'archer'
              ? looserBefore.archer_xp
              : looserBefore.duelist_xp
          : 0;

        const newLevel = levelFromXp(newXp);
        const oldLevel = levelFromXp(oldXp);

        // Track wizard level if it changed
        if (newLevel > oldLevel) {
          try {
            await this.questsService.trackWizardLevel(
              looserId,
              lChar,
              newLevel
            );
          } catch (error) {
            console.error('Failed to track wizard level quest:', error);
          }
        }
      }
    }

    return {
      success: true,
      winnerXP: winnerXP,
      looserXP: looserXP,
    };
  }
  async rewardGold(userId: string) {
    const goldAmount = Math.floor(Math.random() * 51) + 50; // Random value between 50-100

    return this.rewardItem(userId, goldAmount, 'Gold');
  }
}

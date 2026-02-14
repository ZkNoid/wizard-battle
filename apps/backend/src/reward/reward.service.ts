import { Injectable } from '@nestjs/common';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { UserService } from '../user/user.service';
import { QuestsService } from '../quests/services/quests.service';
import { IRandomItem } from '../../../common/types/gameplay.types';

/**
 * XP thresholds for each level (same as frontend)
 */
const LEVELS_XP = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
  180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320,
  330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470,
  480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620,
  630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770,
  780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920,
  930, 940, 950, 960, 970, 980, 990, 1000,
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

    // Get current XP before update to check for level ups
    const winnerBefore = await this.userService.findByAddress(winnerId);
    const looserBefore = await this.userService.findByAddress(looserId);

    await this.userService.addXP(winnerId, winnerXP, winnerCharacter);
    await this.userService.addXP(looserId, looserXP, looserCharacter);

    // Get updated XP after adding
    const winnerAfter = await this.userService.findByAddress(winnerId);
    const looserAfter = await this.userService.findByAddress(looserId);

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
          await this.questsService.trackWizardLevel(looserId, lChar, newLevel);
        } catch (error) {
          console.error('Failed to track wizard level quest:', error);
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

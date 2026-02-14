import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserQuest, UserQuestDocument } from '../schemas/user-quest.schema';

/**
 * Point values for each tier
 */
const TIER_POINTS = {
  TIER_1: 5,
  TIER_2: 10,
  TIER_3: 15,
  TIER_4: 20,
  TIER_5: 25,
  TIER_6: 30,
};

/**
 * Quest completion requirements
 */
const QUEST_REQUIREMENTS = {
  // Tier 1
  PVE_DUELS_REQUIRED: 1,
  PVP_DUELS_REQUIRED: 1,
  EXPEDITIONS_STARTED_REQUIRED: 1,
  EXPEDITIONS_COMPLETED_REQUIRED: 1,

  // Tier 2
  PVP_WINS_TIER2: 1,
  PVE_WINS_TIER2: 1,

  // Tier 3
  TOTAL_BATTLES_TIER3: 10,
  PVP_WINS_TIER3: 3,
  PVE_WINS_TIER3: 3,
  LEVEL_TEN: 10,

  // Tier 4
  TOTAL_ROUNDS_TIER4: 20,
  TOTAL_WINS_TIER4: 10,

  // Tier 5
  LEVEL_TWENTY: 20,
  LEVEL_FIVE_EACH: 5,
  PVP_WINS_TIER5: 10,
  PVE_WINS_TIER5: 10,
};

type WizardType = 'mage' | 'archer' | 'duelist';

@Injectable()
export class QuestsService {
  constructor(
    @InjectModel(UserQuest.name)
    private readonly userQuestModel: Model<UserQuestDocument>
  ) {}

  /**
   * Get or create user quest document
   */
  async getOrCreateUserQuest(userId: string): Promise<UserQuestDocument> {
    let userQuest = await this.userQuestModel.findOne({ userId }).exec();

    if (!userQuest) {
      userQuest = new this.userQuestModel({
        userId,
        wizardWins: { mage: 0, archer: 0, duelist: 0 },
        wizardLevels: { mage: 1, archer: 1, duelist: 1 },
      });
      await userQuest.save();
    }

    return userQuest;
  }

  /**
   * Get user quest progress
   */
  async getUserQuest(userId: string): Promise<UserQuest | null> {
    return this.userQuestModel.findOne({ userId }).exec();
  }

  /**
   * Calculate total points based on quest completion
   */
  private calculateTotalPoints(quest: UserQuestDocument): number {
    let points = 0;

    // Tier 1 (5 points each)
    if (quest.startGame) points += TIER_POINTS.TIER_1;
    if (quest.pveDuelsCompleted >= QUEST_REQUIREMENTS.PVE_DUELS_REQUIRED)
      points += TIER_POINTS.TIER_1;
    if (quest.pvpDuelsCompleted >= QUEST_REQUIREMENTS.PVP_DUELS_REQUIRED)
      points += TIER_POINTS.TIER_1;
    if (quest.expeditionsStarted >= QUEST_REQUIREMENTS.EXPEDITIONS_STARTED_REQUIRED)
      points += TIER_POINTS.TIER_1;
    if (quest.expeditionsCompleted >= QUEST_REQUIREMENTS.EXPEDITIONS_COMPLETED_REQUIRED)
      points += TIER_POINTS.TIER_1;

    // Tier 2 (10 points each)
    if (quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER2)
      points += TIER_POINTS.TIER_2;
    if (quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER2)
      points += TIER_POINTS.TIER_2;
    if (quest.wonWithLowHp) points += TIER_POINTS.TIER_2;
    if (quest.leveledUpWizard) points += TIER_POINTS.TIER_2;
    if (quest.itemsCrafted >= 1) points += TIER_POINTS.TIER_2;

    // Tier 3 (15 points each)
    if (quest.totalBattlesPlayed >= QUEST_REQUIREMENTS.TOTAL_BATTLES_TIER3)
      points += TIER_POINTS.TIER_3;
    if (quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER3)
      points += TIER_POINTS.TIER_3;
    if (quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER3)
      points += TIER_POINTS.TIER_3;
    // Win with each wizard
    if (
      quest.wizardWins.mage >= 1 &&
      quest.wizardWins.archer >= 1 &&
      quest.wizardWins.duelist >= 1
    ) {
      points += TIER_POINTS.TIER_3;
    }
    // Reach level 10 with any wizard
    if (
      quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TEN ||
      quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TEN ||
      quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TEN
    ) {
      points += TIER_POINTS.TIER_3;
    }

    // Tier 4 (20 points each)
    if (quest.totalRoundsPlayed >= QUEST_REQUIREMENTS.TOTAL_ROUNDS_TIER4)
      points += TIER_POINTS.TIER_4;
    if (quest.totalWins >= QUEST_REQUIREMENTS.TOTAL_WINS_TIER4)
      points += TIER_POINTS.TIER_4;
    if (quest.hasFullyGearedWizard) points += TIER_POINTS.TIER_4;
    if (quest.hasUpgradedGear) points += TIER_POINTS.TIER_4;
    if (quest.wonWithFullHp) points += TIER_POINTS.TIER_4;

    // Tier 5 (25 points each)
    // Reach level 20 with any wizard
    if (
      quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
      quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
      quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TWENTY
    ) {
      points += TIER_POINTS.TIER_5;
    }
    // Reach level 5 with each wizard
    if (
      quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
      quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
      quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH
    ) {
      points += TIER_POINTS.TIER_5;
    }
    if (quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER5)
      points += TIER_POINTS.TIER_5;
    if (quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER5)
      points += TIER_POINTS.TIER_5;
    if (quest.hasFullSetLevelTwoGear) points += TIER_POINTS.TIER_5;

    // Tier 6 (30 points)
    if (quest.submittedFeedback) points += TIER_POINTS.TIER_6;

    return points;
  }

  /**
   * Update and save quest with recalculated points
   */
  private async saveAndRecalculatePoints(
    quest: UserQuestDocument
  ): Promise<UserQuestDocument> {
    quest.totalPoints = this.calculateTotalPoints(quest);
    quest.lastUpdated = new Date();
    await quest.save();
    return quest;
  }

  // ==================== TIER 1 QUEST UPDATES ====================

  /**
   * Track: Start your game (first matchmaking join)
   */
  async trackGameStart(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    if (!quest.startGame) {
      quest.startGame = true;
      await this.saveAndRecalculatePoints(quest);
      console.log(`🎯 Quest: User ${userId} started their first game`);
    }
  }

  /**
   * Track: Complete PvE duel (battle vs bot completed)
   */
  async trackPveDuelComplete(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.pveDuelsCompleted += 1;
    quest.totalBattlesPlayed += 1;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} completed PvE duel #${quest.pveDuelsCompleted}`
    );
  }

  /**
   * Track: Complete PvP duel (battle vs human completed)
   */
  async trackPvpDuelComplete(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.pvpDuelsCompleted += 1;
    quest.totalBattlesPlayed += 1;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} completed PvP duel #${quest.pvpDuelsCompleted}`
    );
  }

  /**
   * Track: Embark on an expedition
   */
  async trackExpeditionStart(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.expeditionsStarted += 1;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} started expedition #${quest.expeditionsStarted}`
    );
  }

  /**
   * Track: Complete an expedition
   */
  async trackExpeditionComplete(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.expeditionsCompleted += 1;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} completed expedition #${quest.expeditionsCompleted}`
    );
  }

  // ==================== TIER 2+ QUEST UPDATES ====================

  /**
   * Track: Win PvP battle
   */
  async trackPvpBattleWin(
    userId: string,
    wizardType: WizardType,
    hpPercentage: number
  ): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);

    quest.pvpBattlesWon += 1;
    quest.totalWins += 1;

    // Track wizard-specific win
    if (wizardType === 'mage') quest.wizardWins.mage += 1;
    else if (wizardType === 'archer') quest.wizardWins.archer += 1;
    else if (wizardType === 'duelist') quest.wizardWins.duelist += 1;

    // Track low HP win (<20%)
    if (hpPercentage < 20 && !quest.wonWithLowHp) {
      quest.wonWithLowHp = true;
      console.log(`🎯 Quest: User ${userId} won with low HP!`);
    }

    // Track full HP win (100%)
    if (hpPercentage >= 100 && !quest.wonWithFullHp) {
      quest.wonWithFullHp = true;
      console.log(`🎯 Quest: User ${userId} won with full HP!`);
    }

    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} won PvP battle #${quest.pvpBattlesWon} with ${wizardType}`
    );
  }

  /**
   * Track: Win PvE battle
   */
  async trackPveBattleWin(
    userId: string,
    wizardType: WizardType,
    hpPercentage: number
  ): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);

    quest.pveBattlesWon += 1;
    quest.totalWins += 1;

    // Track wizard-specific win
    if (wizardType === 'mage') quest.wizardWins.mage += 1;
    else if (wizardType === 'archer') quest.wizardWins.archer += 1;
    else if (wizardType === 'duelist') quest.wizardWins.duelist += 1;

    // Track low HP win (<20%)
    if (hpPercentage < 20 && !quest.wonWithLowHp) {
      quest.wonWithLowHp = true;
      console.log(`🎯 Quest: User ${userId} won with low HP!`);
    }

    // Track full HP win (100%)
    if (hpPercentage >= 100 && !quest.wonWithFullHp) {
      quest.wonWithFullHp = true;
      console.log(`🎯 Quest: User ${userId} won with full HP!`);
    }

    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} won PvE battle #${quest.pveBattlesWon} with ${wizardType}`
    );
  }

  /**
   * Track: Rounds played in a match
   */
  async trackRoundsPlayed(userId: string, roundsCount: number): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.totalRoundsPlayed += roundsCount;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} played ${roundsCount} rounds (total: ${quest.totalRoundsPlayed})`
    );
  }

  /**
   * Track: Wizard level up
   */
  async trackWizardLevel(
    userId: string,
    wizardType: WizardType,
    newLevel: number
  ): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);

    // Update wizard level if higher
    const currentLevel =
      wizardType === 'mage'
        ? quest.wizardLevels.mage
        : wizardType === 'archer'
          ? quest.wizardLevels.archer
          : quest.wizardLevels.duelist;

    if (newLevel > currentLevel) {
      if (wizardType === 'mage') quest.wizardLevels.mage = newLevel;
      else if (wizardType === 'archer') quest.wizardLevels.archer = newLevel;
      else if (wizardType === 'duelist') quest.wizardLevels.duelist = newLevel;

      // Track level up achievement
      if (!quest.leveledUpWizard && newLevel > 1) {
        quest.leveledUpWizard = true;
        console.log(`🎯 Quest: User ${userId} leveled up a wizard!`);
      }

      await this.saveAndRecalculatePoints(quest);
      console.log(
        `🎯 Quest: User ${userId} ${wizardType} reached level ${newLevel}`
      );
    }
  }

  /**
   * Track: Item crafted
   */
  async trackItemCrafted(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    quest.itemsCrafted += 1;
    await this.saveAndRecalculatePoints(quest);
    console.log(
      `🎯 Quest: User ${userId} crafted item #${quest.itemsCrafted}`
    );
  }

  /**
   * Track: Gear upgraded
   */
  async trackGearUpgrade(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    if (!quest.hasUpgradedGear) {
      quest.hasUpgradedGear = true;
      await this.saveAndRecalculatePoints(quest);
      console.log(`🎯 Quest: User ${userId} upgraded gear!`);
    }
  }

  /**
   * Track: Fully geared wizard
   */
  async trackFullyGearedWizard(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    if (!quest.hasFullyGearedWizard) {
      quest.hasFullyGearedWizard = true;
      await this.saveAndRecalculatePoints(quest);
      console.log(`🎯 Quest: User ${userId} has a fully geared wizard!`);
    }
  }

  /**
   * Track: Full set of level 2 gear
   */
  async trackFullSetLevelTwoGear(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    if (!quest.hasFullSetLevelTwoGear) {
      quest.hasFullSetLevelTwoGear = true;
      await this.saveAndRecalculatePoints(quest);
      console.log(`🎯 Quest: User ${userId} has full set of lvl 2 gear!`);
    }
  }

  /**
   * Track: Feedback submitted
   */
  async trackFeedbackSubmitted(userId: string): Promise<void> {
    const quest = await this.getOrCreateUserQuest(userId);
    if (!quest.submittedFeedback) {
      quest.submittedFeedback = true;
      await this.saveAndRecalculatePoints(quest);
      console.log(`🎯 Quest: User ${userId} submitted feedback!`);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get quest completion status for all quests
   */
  async getQuestCompletionStatus(userId: string): Promise<{
    tier1: {
      startGame: boolean;
      completePveDuel: boolean;
      completePvpDuel: boolean;
      embarkExpedition: boolean;
      completeExpedition: boolean;
    };
    tier2: {
      winPvpBattle: boolean;
      winPveBattle: boolean;
      winWithLowHp: boolean;
      levelUpWizard: boolean;
      craftGear: boolean;
    };
    tier3: {
      playTenBattles: boolean;
      winThreePvpBattles: boolean;
      winThreePveBattles: boolean;
      winWithEachWizard: boolean;
      reachLevelTen: boolean;
    };
    tier4: {
      playTwentyRounds: boolean;
      winTenTimes: boolean;
      fullyGearedWizard: boolean;
      upgradeGear: boolean;
      winWithFullHp: boolean;
    };
    tier5: {
      reachLevelTwenty: boolean;
      reachLevelFiveEachWizard: boolean;
      winTenPvpBattles: boolean;
      winTenPveBattles: boolean;
      fullSetLevelTwoGear: boolean;
    };
    tier6: {
      submitFeedback: boolean;
    };
    totalPoints: number;
    progress: {
      pveDuelsCompleted: number;
      pvpDuelsCompleted: number;
      expeditionsStarted: number;
      expeditionsCompleted: number;
      pvpBattlesWon: number;
      pveBattlesWon: number;
      totalBattlesPlayed: number;
      totalRoundsPlayed: number;
      totalWins: number;
      itemsCrafted: number;
      wizardWins: { mage: number; archer: number; duelist: number };
      wizardLevels: { mage: number; archer: number; duelist: number };
    };
  } | null> {
    const quest = await this.getUserQuest(userId);
    if (!quest) return null;

    return {
      tier1: {
        startGame: quest.startGame,
        completePveDuel:
          quest.pveDuelsCompleted >= QUEST_REQUIREMENTS.PVE_DUELS_REQUIRED,
        completePvpDuel:
          quest.pvpDuelsCompleted >= QUEST_REQUIREMENTS.PVP_DUELS_REQUIRED,
        embarkExpedition:
          quest.expeditionsStarted >=
          QUEST_REQUIREMENTS.EXPEDITIONS_STARTED_REQUIRED,
        completeExpedition:
          quest.expeditionsCompleted >=
          QUEST_REQUIREMENTS.EXPEDITIONS_COMPLETED_REQUIRED,
      },
      tier2: {
        winPvpBattle: quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER2,
        winPveBattle: quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER2,
        winWithLowHp: quest.wonWithLowHp,
        levelUpWizard: quest.leveledUpWizard,
        craftGear: quest.itemsCrafted >= 1,
      },
      tier3: {
        playTenBattles:
          quest.totalBattlesPlayed >= QUEST_REQUIREMENTS.TOTAL_BATTLES_TIER3,
        winThreePvpBattles:
          quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER3,
        winThreePveBattles:
          quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER3,
        winWithEachWizard:
          quest.wizardWins.mage >= 1 &&
          quest.wizardWins.archer >= 1 &&
          quest.wizardWins.duelist >= 1,
        reachLevelTen:
          quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TEN ||
          quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TEN ||
          quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TEN,
      },
      tier4: {
        playTwentyRounds:
          quest.totalRoundsPlayed >= QUEST_REQUIREMENTS.TOTAL_ROUNDS_TIER4,
        winTenTimes: quest.totalWins >= QUEST_REQUIREMENTS.TOTAL_WINS_TIER4,
        fullyGearedWizard: quest.hasFullyGearedWizard,
        upgradeGear: quest.hasUpgradedGear,
        winWithFullHp: quest.wonWithFullHp,
      },
      tier5: {
        reachLevelTwenty:
          quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
          quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
          quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TWENTY,
        reachLevelFiveEachWizard:
          quest.wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
          quest.wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
          quest.wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH,
        winTenPvpBattles:
          quest.pvpBattlesWon >= QUEST_REQUIREMENTS.PVP_WINS_TIER5,
        winTenPveBattles:
          quest.pveBattlesWon >= QUEST_REQUIREMENTS.PVE_WINS_TIER5,
        fullSetLevelTwoGear: quest.hasFullSetLevelTwoGear,
      },
      tier6: {
        submitFeedback: quest.submittedFeedback,
      },
      totalPoints: quest.totalPoints,
      progress: {
        pveDuelsCompleted: quest.pveDuelsCompleted,
        pvpDuelsCompleted: quest.pvpDuelsCompleted,
        expeditionsStarted: quest.expeditionsStarted,
        expeditionsCompleted: quest.expeditionsCompleted,
        pvpBattlesWon: quest.pvpBattlesWon,
        pveBattlesWon: quest.pveBattlesWon,
        totalBattlesPlayed: quest.totalBattlesPlayed,
        totalRoundsPlayed: quest.totalRoundsPlayed,
        totalWins: quest.totalWins,
        itemsCrafted: quest.itemsCrafted,
        wizardWins: {
          mage: quest.wizardWins?.mage ?? 0,
          archer: quest.wizardWins?.archer ?? 0,
          duelist: quest.wizardWins?.duelist ?? 0,
        },
        wizardLevels: {
          mage: quest.wizardLevels?.mage ?? 1,
          archer: quest.wizardLevels?.archer ?? 1,
          duelist: quest.wizardLevels?.duelist ?? 1,
        },
      },
    };
  }

  /**
   * Get leaderboard by total points
   */
  async getLeaderboard(
    limit = 100
  ): Promise<{ userId: string; totalPoints: number }[]> {
    return this.userQuestModel
      .find()
      .sort({ totalPoints: -1 })
      .limit(limit)
      .select('userId totalPoints')
      .lean()
      .exec();
  }
}


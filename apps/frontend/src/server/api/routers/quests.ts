import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const questsCollection = 'userquests';

// Quest completion requirements (must match backend)
const QUEST_REQUIREMENTS = {
  PVE_DUELS_REQUIRED: 1,
  PVP_DUELS_REQUIRED: 1,
  EXPEDITIONS_STARTED_REQUIRED: 1,
  EXPEDITIONS_COMPLETED_REQUIRED: 1,
  PVP_WINS_TIER2: 1,
  PVE_WINS_TIER2: 1,
  TOTAL_BATTLES_TIER3: 10,
  PVP_WINS_TIER3: 3,
  PVE_WINS_TIER3: 3,
  LEVEL_TEN: 10,
  TOTAL_ROUNDS_TIER4: 20,
  TOTAL_WINS_TIER4: 10,
  LEVEL_TWENTY: 20,
  LEVEL_FIVE_EACH: 5,
  PVP_WINS_TIER5: 10,
  PVE_WINS_TIER5: 10,
};

// Type for user quest document from database
interface UserQuestDB {
  userId: string;
  startGame: boolean;
  pveDuelsCompleted: number;
  pvpDuelsCompleted: number;
  expeditionsStarted: number;
  expeditionsCompleted: number;
  pvpBattlesWon: number;
  pveBattlesWon: number;
  wonWithLowHp: boolean;
  leveledUpWizard: boolean;
  itemsCrafted: number;
  totalBattlesPlayed: number;
  wizardWins: { mage: number; archer: number; duelist: number };
  wizardLevels: { mage: number; archer: number; duelist: number };
  totalRoundsPlayed: number;
  totalWins: number;
  hasFullyGearedWizard: boolean;
  hasUpgradedGear: boolean;
  wonWithFullHp: boolean;
  hasFullSetLevelTwoGear: boolean;
  submittedFeedback: boolean;
  totalPoints: number;
}

// Transform database document to quest status response
function transformToQuestStatus(quest: UserQuestDB | null) {
  if (!quest) {
    // Return default empty state
    return {
      tier1: {
        startGame: false,
        completePveDuel: false,
        completePvpDuel: false,
        embarkExpedition: false,
        completeExpedition: false,
      },
      tier2: {
        winPvpBattle: false,
        winPveBattle: false,
        winWithLowHp: false,
        levelUpWizard: false,
        craftGear: false,
      },
      tier3: {
        playTenBattles: false,
        winThreePvpBattles: false,
        winThreePveBattles: false,
        winWithEachWizard: false,
        reachLevelTen: false,
      },
      tier4: {
        playTwentyRounds: false,
        winTenTimes: false,
        fullyGearedWizard: false,
        upgradeGear: false,
        winWithFullHp: false,
      },
      tier5: {
        reachLevelTwenty: false,
        reachLevelFiveEachWizard: false,
        winTenPvpBattles: false,
        winTenPveBattles: false,
        fullSetLevelTwoGear: false,
      },
      tier6: {
        submitFeedback: false,
      },
      totalPoints: 0,
      progress: {
        pveDuelsCompleted: 0,
        pvpDuelsCompleted: 0,
        expeditionsStarted: 0,
        expeditionsCompleted: 0,
        pvpBattlesWon: 0,
        pveBattlesWon: 0,
        totalBattlesPlayed: 0,
        totalRoundsPlayed: 0,
        totalWins: 0,
        itemsCrafted: 0,
        wizardWins: { mage: 0, archer: 0, duelist: 0 },
        wizardLevels: { mage: 1, archer: 1, duelist: 1 },
      },
    };
  }

  const wizardWins = quest.wizardWins ?? { mage: 0, archer: 0, duelist: 0 };
  const wizardLevels = quest.wizardLevels ?? { mage: 1, archer: 1, duelist: 1 };

  return {
    tier1: {
      startGame: quest.startGame ?? false,
      completePveDuel:
        (quest.pveDuelsCompleted ?? 0) >= QUEST_REQUIREMENTS.PVE_DUELS_REQUIRED,
      completePvpDuel:
        (quest.pvpDuelsCompleted ?? 0) >= QUEST_REQUIREMENTS.PVP_DUELS_REQUIRED,
      embarkExpedition:
        (quest.expeditionsStarted ?? 0) >=
        QUEST_REQUIREMENTS.EXPEDITIONS_STARTED_REQUIRED,
      completeExpedition:
        (quest.expeditionsCompleted ?? 0) >=
        QUEST_REQUIREMENTS.EXPEDITIONS_COMPLETED_REQUIRED,
    },
    tier2: {
      winPvpBattle:
        (quest.pvpBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER2,
      winPveBattle:
        (quest.pveBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER2,
      winWithLowHp: quest.wonWithLowHp ?? false,
      levelUpWizard: quest.leveledUpWizard ?? false,
      craftGear: (quest.itemsCrafted ?? 0) >= 1,
    },
    tier3: {
      playTenBattles:
        (quest.totalBattlesPlayed ?? 0) >=
        QUEST_REQUIREMENTS.TOTAL_BATTLES_TIER3,
      winThreePvpBattles:
        (quest.pvpBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER3,
      winThreePveBattles:
        (quest.pveBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER3,
      winWithEachWizard:
        wizardWins.mage >= 1 &&
        wizardWins.archer >= 1 &&
        wizardWins.duelist >= 1,
      reachLevelTen:
        wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TEN ||
        wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TEN ||
        wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TEN,
    },
    tier4: {
      playTwentyRounds:
        (quest.totalRoundsPlayed ?? 0) >=
        QUEST_REQUIREMENTS.TOTAL_ROUNDS_TIER4,
      winTenTimes:
        (quest.totalWins ?? 0) >= QUEST_REQUIREMENTS.TOTAL_WINS_TIER4,
      fullyGearedWizard: quest.hasFullyGearedWizard ?? false,
      upgradeGear: quest.hasUpgradedGear ?? false,
      winWithFullHp: quest.wonWithFullHp ?? false,
    },
    tier5: {
      reachLevelTwenty:
        wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
        wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
        wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_TWENTY,
      reachLevelFiveEachWizard:
        wizardLevels.mage >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
        wizardLevels.archer >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
        wizardLevels.duelist >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH,
      winTenPvpBattles:
        (quest.pvpBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER5,
      winTenPveBattles:
        (quest.pveBattlesWon ?? 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER5,
      fullSetLevelTwoGear: quest.hasFullSetLevelTwoGear ?? false,
    },
    tier6: {
      submitFeedback: quest.submittedFeedback ?? false,
    },
    totalPoints: quest.totalPoints ?? 0,
    progress: {
      pveDuelsCompleted: quest.pveDuelsCompleted ?? 0,
      pvpDuelsCompleted: quest.pvpDuelsCompleted ?? 0,
      expeditionsStarted: quest.expeditionsStarted ?? 0,
      expeditionsCompleted: quest.expeditionsCompleted ?? 0,
      pvpBattlesWon: quest.pvpBattlesWon ?? 0,
      pveBattlesWon: quest.pveBattlesWon ?? 0,
      totalBattlesPlayed: quest.totalBattlesPlayed ?? 0,
      totalRoundsPlayed: quest.totalRoundsPlayed ?? 0,
      totalWins: quest.totalWins ?? 0,
      itemsCrafted: quest.itemsCrafted ?? 0,
      wizardWins,
      wizardLevels,
    },
  };
}

export const questsRouter = createTRPCRouter({
  // Get quest progress for a user
  getUserQuests: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const quest = (await db
        .collection(questsCollection)
        .findOne({ userId: input.userId })) as unknown as UserQuestDB | null;

      return transformToQuestStatus(quest);
    }),

  // Get leaderboard
  getLeaderboard: publicProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const leaderboard = await db
        .collection(questsCollection)
        .find({})
        .sort({ totalPoints: -1 })
        .limit(input.limit)
        .project({ userId: 1, totalPoints: 1, _id: 0 })
        .toArray();

      return leaderboard.map((item, index) => ({
        place: index + 1,
        walletAddress: item.userId as string,
        points: (item.totalPoints as number) ?? 0,
      }));
    }),

  // Track feedback submission
  submitFeedback: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      await db.collection(questsCollection).updateOne(
        { userId: input.userId },
        {
          $set: {
            submittedFeedback: true,
            lastUpdated: new Date(),
          },
          $inc: { totalPoints: 30 }, // Tier 6 points
          $setOnInsert: { userId: input.userId },
        },
        { upsert: true }
      );

      return { success: true };
    }),
});

export type QuestsRouter = typeof questsRouter;


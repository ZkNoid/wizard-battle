import { create } from 'zustand';
import { trpcClient } from '@/trpc/vanilla';
import type {
  ITestnetBlock,
  ITestnetLeaderboardItem,
} from '@/lib/types/ITestnet';

interface QuestProgress {
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
}

interface QuestStatus {
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
  progress: QuestProgress;
}

interface QuestStore {
  // Loading states
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  error: string | null;

  // Data
  questStatus: QuestStatus | null;
  leaderboard: ITestnetLeaderboardItem[];
  userRank: ITestnetLeaderboardItem | null;

  // Actions
  loadUserQuests: (userId: string) => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  submitFeedback: (userId: string) => Promise<boolean>;

  // Selectors
  getTestnetBlocks: () => ITestnetBlock[];
  getTotalQuests: () => number;
  getCompletedQuests: () => number;
}

const defaultQuestStatus: QuestStatus = {
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

export const useQuestStore = create<QuestStore>()((set, get) => ({
  isLoading: false,
  isLeaderboardLoading: false,
  error: null,
  questStatus: null,
  leaderboard: [],
  userRank: null,

  loadUserQuests: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const questStatus = await trpcClient.quests.getUserQuests.query({
        userId,
      });

      // Load leaderboard to find user's rank
      const leaderboard = await trpcClient.quests.getLeaderboard.query({
        limit: 1000, // Get more to find user's position
      });

      const userRankEntry = leaderboard.find(
        (entry) => entry.walletAddress === userId
      );

      set({
        questStatus,
        userRank: userRankEntry ?? {
          place: leaderboard.length + 1,
          walletAddress: userId,
          points: questStatus.totalPoints,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load quests',
        isLoading: false,
      });
    }
  },

  loadLeaderboard: async () => {
    set({ isLeaderboardLoading: true, error: null });

    try {
      const leaderboard = await trpcClient.quests.getLeaderboard.query({
        limit: 1000,
      });

      set({
        leaderboard,
        isLeaderboardLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load leaderboard',
        isLeaderboardLoading: false,
      });
    }
  },

  submitFeedback: async (userId: string) => {
    try {
      await trpcClient.quests.submitFeedback.mutate({ userId });
      // Reload quests to get updated status
      await get().loadUserQuests(userId);
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to submit feedback',
      });
      return false;
    }
  },

  getTestnetBlocks: () => {
    const status = get().questStatus ?? defaultQuestStatus;

    return [
      {
        title: 'Tier 1: Meet the game',
        points: 5,
        items: [
          { isCompleted: status.tier1.startGame, title: 'Start a game' },
          {
            isCompleted: status.tier1.completePveDuel,
            title: 'Complete 1 PvE duel',
          },
          {
            isCompleted: status.tier1.completePvpDuel,
            title: 'Complete 1 PvP duel',
          },
          {
            isCompleted: status.tier1.embarkExpedition,
            title: 'Embark on an expedition',
          },
          {
            isCompleted: status.tier1.completeExpedition,
            title: 'Complete an expedition',
          },
        ],
      },
      {
        title: 'Tier 2: First steps',
        points: 10,
        items: [
          { isCompleted: status.tier2.winPveBattle, title: 'Win 1 PvE battle' },
          { isCompleted: status.tier2.winPvpBattle, title: 'Win 1 PvP battle' },
          {
            isCompleted: status.tier2.winWithLowHp,
            title: 'Win with <20% HP remaining',
          },
          {
            isCompleted: status.tier2.levelUpWizard,
            title: 'Level up 1 wizard',
          },
          {
            isCompleted: status.tier2.craftGear,
            title: 'Craft 1 piece of gear',
          },
        ],
      },
      {
        title: 'Tier 3: Early wizard',
        points: 15,
        items: [
          {
            isCompleted: status.tier3.playTenBattles,
            title: 'Play 10 total battles',
          },
          {
            isCompleted: status.tier3.winThreePveBattles,
            title: 'Win 3 PvE battles',
          },
          {
            isCompleted: status.tier3.winThreePvpBattles,
            title: 'Win 3 PvP battles',
          },
          {
            isCompleted: status.tier3.winWithEachWizard,
            title: 'Win with each wizard type',
          },
          {
            isCompleted: status.tier3.reachLevelTen,
            title: 'Reach LvL 10 with any wizard',
          },
        ],
      },
      {
        title: 'Tier 4: Experienced wizard',
        points: 20,
        items: [
          {
            isCompleted: status.tier4.playTwentyRounds,
            title: 'Play 20 rounds in any match',
          },
          { isCompleted: status.tier4.winTenTimes, title: 'Win 10 duels' },
          {
            isCompleted: status.tier4.fullyGearedWizard,
            title: 'Have a fully geared wizard',
          },
          { isCompleted: status.tier4.upgradeGear, title: 'Upgrade any gear' },
          {
            isCompleted: status.tier4.winWithFullHp,
            title: 'Win a battle with full HP',
          },
        ],
      },
      {
        title: 'Tier 5: Master wizard',
        points: 25,
        items: [
          {
            isCompleted: status.tier5.reachLevelTwenty,
            title: 'Reach LvL 20 with any wizard',
          },
          {
            isCompleted: status.tier5.reachLevelFiveEachWizard,
            title: 'Reach LvL 5 with each wizard',
          },
          {
            isCompleted: status.tier5.winTenPvpBattles,
            title: 'Win 10 PvP battles',
          },
          {
            isCompleted: status.tier5.winTenPveBattles,
            title: 'Win 10 PvE battles',
          },
          {
            isCompleted: status.tier5.fullSetLevelTwoGear,
            title: 'Have a full set of lvl 2 gear',
          },
        ],
      },
      {
        title: 'Tier 6: Leave feedback(Available after 23.02.2026)',
        points: 30,
        items: [
          {
            isCompleted: status.tier6.submitFeedback,
            title: 'Submit feedback',
            link: 'https://forms.gle/k7ynkkUT53fpfnxH8',
          },
        ],
      },
    ];
  },

  getTotalQuests: () => {
    const blocks = get().getTestnetBlocks();
    return blocks.reduce((sum, block) => sum + block.items.length, 0);
  },

  getCompletedQuests: () => {
    const blocks = get().getTestnetBlocks();
    return blocks.reduce(
      (sum, block) =>
        sum + block.items.filter((item) => item.isCompleted).length,
      0
    );
  },
}));

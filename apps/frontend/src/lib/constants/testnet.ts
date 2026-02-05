import type { ITestnetBlock, ITestnetLeaderboardItem } from '../types/ITestnet';

export const TESTNET_BLOCKS: ITestnetBlock[] = [
  {
    title: 'Tier 1: Meet the game',
    points: 5,
    items: [
      { isCompleted: false, title: 'Connect Wallet' },
      { isCompleted: false, title: 'Complete 1 PvE duel' },
      { isCompleted: false, title: 'Complete 1 PvP duel' },
      { isCompleted: false, title: 'Embark on an expedition' },
      { isCompleted: false, title: 'Save your custom map' },
    ],
  },
  {
    title: 'Tier 2: First steps',
    points: 10,
    items: [
      { isCompleted: false, title: 'Win 1 PvE battle' },
      { isCompleted: false, title: 'Win 1 PvP battle' },
      { isCompleted: false, title: 'Win with <20% HP remaining' },
      { isCompleted: false, title: 'Level up 1 wizard' },
      { isCompleted: false, title: 'Craft and equip 1 peace of gear' },
    ],
  },
  {
    title: 'Tier 3: Early wizard',
    points: 15,
    items: [
      { isCompleted: false, title: 'Play 10 total battles' },
      { isCompleted: false, title: 'Win 3 PvE battle' },
      { isCompleted: false, title: 'Win 3 PvP battle' },
      { isCompleted: false, title: 'Reach LvL 10 with any wizard' },
      { isCompleted: false, title: 'Craft and equip 1 peace of gear' },
    ],
  },
  {
    title: 'Tier 4: Experienced wizard',
    points: 20,
    items: [
      { isCompleted: false, title: 'Play 20 rounds in any match' },
      { isCompleted: false, title: 'Win 10 duels' },
      { isCompleted: false, title: 'Have a fully geared wizard' },
      { isCompleted: false, title: 'Upgrade any gear' },
      { isCompleted: false, title: 'Win a battle with full HP' },
    ],
  },
  {
    title: 'Tier 5: Experienced wizard',
    points: 25,
    items: [
      { isCompleted: false, title: 'Reach LvL 20 with any wizard' },
      { isCompleted: false, title: 'Win 10 PvE battles' },
      { isCompleted: false, title: 'Win 10 PvP battles' },
      { isCompleted: false, title: 'Have a full set of lvl 2 gear' },
    ],
  },
  {
    title: 'Tier 6: Leave feedback',
    points: 10,
    items: [
      { isCompleted: false, title: 'Win a battle with full HP' },
    ],
  },
];

export const TESTNET_LEADERBOARD: ITestnetLeaderboardItem[] = [];

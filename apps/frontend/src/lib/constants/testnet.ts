// Constants file for testnet configuration
// Quest data is now fetched from the server via questStore

// Testnet end date
export const TESTNET_END_DATE = new Date('2026-03-31T23:59:59');

// Points configuration (must match backend)
export const TIER_POINTS = {
  TIER_1: 5,
  TIER_2: 10,
  TIER_3: 15,
  TIER_4: 20,
  TIER_5: 25,
  TIER_6: 30,
};

// Quest requirements (must match backend)
export const QUEST_REQUIREMENTS = {
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

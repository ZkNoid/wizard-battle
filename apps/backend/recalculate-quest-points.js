/**
 * Script to recalculate total points for all users based on quest completion
 * Run with: node recalculate-quest-points.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Point values for each tier (must match quests.service.ts)
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
 * Quest completion requirements (must match quests.service.ts)
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

// Define the UserQuest schema
const userQuestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    startGame: { type: Boolean, default: false },
    pveDuelsCompleted: { type: Number, default: 0 },
    pvpDuelsCompleted: { type: Number, default: 0 },
    expeditionsStarted: { type: Number, default: 0 },
    expeditionsCompleted: { type: Number, default: 0 },
    pvpBattlesWon: { type: Number, default: 0 },
    pveBattlesWon: { type: Number, default: 0 },
    wonWithLowHp: { type: Boolean, default: false },
    leveledUpWizard: { type: Boolean, default: false },
    itemsCrafted: { type: Number, default: 0 },
    totalBattlesPlayed: { type: Number, default: 0 },
    wizardWins: {
      mage: { type: Number, default: 0 },
      archer: { type: Number, default: 0 },
      duelist: { type: Number, default: 0 },
    },
    wizardLevels: {
      mage: { type: Number, default: 1 },
      archer: { type: Number, default: 1 },
      duelist: { type: Number, default: 1 },
    },
    totalRoundsPlayed: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    hasFullyGearedWizard: { type: Boolean, default: false },
    hasUpgradedGear: { type: Boolean, default: false },
    wonWithFullHp: { type: Boolean, default: false },
    hasFullSetLevelTwoGear: { type: Boolean, default: false },
    submittedFeedback: { type: Boolean, default: false },
    totalPoints: { type: Number, default: 0 },
    lastUpdated: { type: Date },
  },
  { timestamps: true }
);

/**
 * Calculate total points based on quest completion
 * This is a copy of the calculateTotalPoints method from QuestsService
 */
function calculateTotalPoints(quest) {
  let points = 0;

  // Tier 1 (5 points each)
  if (quest.startGame) points += TIER_POINTS.TIER_1;
  if ((quest.pveDuelsCompleted || 0) >= QUEST_REQUIREMENTS.PVE_DUELS_REQUIRED)
    points += TIER_POINTS.TIER_1;
  if ((quest.pvpDuelsCompleted || 0) >= QUEST_REQUIREMENTS.PVP_DUELS_REQUIRED)
    points += TIER_POINTS.TIER_1;
  if ((quest.expeditionsStarted || 0) >= QUEST_REQUIREMENTS.EXPEDITIONS_STARTED_REQUIRED)
    points += TIER_POINTS.TIER_1;
  if ((quest.expeditionsCompleted || 0) >= QUEST_REQUIREMENTS.EXPEDITIONS_COMPLETED_REQUIRED)
    points += TIER_POINTS.TIER_1;

  // Tier 2 (10 points each)
  if ((quest.pvpBattlesWon || 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER2)
    points += TIER_POINTS.TIER_2;
  if ((quest.pveBattlesWon || 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER2)
    points += TIER_POINTS.TIER_2;
  if (quest.wonWithLowHp) points += TIER_POINTS.TIER_2;
  if (quest.leveledUpWizard) points += TIER_POINTS.TIER_2;
  if ((quest.itemsCrafted || 0) >= 1) points += TIER_POINTS.TIER_2;

  // Tier 3 (15 points each)
  if ((quest.totalBattlesPlayed || 0) >= QUEST_REQUIREMENTS.TOTAL_BATTLES_TIER3)
    points += TIER_POINTS.TIER_3;
  if ((quest.pvpBattlesWon || 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER3)
    points += TIER_POINTS.TIER_3;
  if ((quest.pveBattlesWon || 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER3)
    points += TIER_POINTS.TIER_3;

  // Win with each wizard
  const wizardWins = quest.wizardWins || {};
  if (
    (wizardWins.mage || 0) >= 1 &&
    (wizardWins.archer || 0) >= 1 &&
    (wizardWins.duelist || 0) >= 1
  ) {
    points += TIER_POINTS.TIER_3;
  }

  // Reach level 10 with any wizard
  const wizardLevels = quest.wizardLevels || {};
  if (
    (wizardLevels.mage || 1) >= QUEST_REQUIREMENTS.LEVEL_TEN ||
    (wizardLevels.archer || 1) >= QUEST_REQUIREMENTS.LEVEL_TEN ||
    (wizardLevels.duelist || 1) >= QUEST_REQUIREMENTS.LEVEL_TEN
  ) {
    points += TIER_POINTS.TIER_3;
  }

  // Tier 4 (20 points each)
  if ((quest.totalRoundsPlayed || 0) >= QUEST_REQUIREMENTS.TOTAL_ROUNDS_TIER4)
    points += TIER_POINTS.TIER_4;
  if ((quest.totalWins || 0) >= QUEST_REQUIREMENTS.TOTAL_WINS_TIER4)
    points += TIER_POINTS.TIER_4;
  if (quest.hasFullyGearedWizard) points += TIER_POINTS.TIER_4;
  if (quest.hasUpgradedGear) points += TIER_POINTS.TIER_4;
  if (quest.wonWithFullHp) points += TIER_POINTS.TIER_4;

  // Tier 5 (25 points each)
  // Reach level 20 with any wizard
  if (
    (wizardLevels.mage || 1) >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
    (wizardLevels.archer || 1) >= QUEST_REQUIREMENTS.LEVEL_TWENTY ||
    (wizardLevels.duelist || 1) >= QUEST_REQUIREMENTS.LEVEL_TWENTY
  ) {
    points += TIER_POINTS.TIER_5;
  }

  // Reach level 5 with each wizard
  if (
    (wizardLevels.mage || 1) >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
    (wizardLevels.archer || 1) >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH &&
    (wizardLevels.duelist || 1) >= QUEST_REQUIREMENTS.LEVEL_FIVE_EACH
  ) {
    points += TIER_POINTS.TIER_5;
  }

  if ((quest.pvpBattlesWon || 0) >= QUEST_REQUIREMENTS.PVP_WINS_TIER5)
    points += TIER_POINTS.TIER_5;
  if ((quest.pveBattlesWon || 0) >= QUEST_REQUIREMENTS.PVE_WINS_TIER5)
    points += TIER_POINTS.TIER_5;
  if (quest.hasFullSetLevelTwoGear) points += TIER_POINTS.TIER_5;

  // Tier 6 (30 points)
  if (quest.submittedFeedback) points += TIER_POINTS.TIER_6;

  return points;
}

async function recalculateAllPoints() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle';
    const dbName = process.env.MONGODB_DB || 'wizardbattle';
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri);
    console.log('   Database:', dbName);
    await mongoose.connect(mongoUri, { dbName });
    console.log('✅ Connected to MongoDB\n');

    const UserQuest =
      mongoose.models.UserQuest ||
      mongoose.model('UserQuest', userQuestSchema, 'userquests');

    // Get all quests
    const allQuests = await UserQuest.find();
    console.log('📊 QUEST POINTS RECALCULATION');
    console.log('═'.repeat(60));
    console.log(`\n👥 Found ${allQuests.length} user quest records\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    const changes = [];

    for (const quest of allQuests) {
      const oldPoints = quest.totalPoints || 0;
      const newPoints = calculateTotalPoints(quest);

      if (oldPoints !== newPoints) {
        quest.totalPoints = newPoints;
        quest.lastUpdated = new Date();
        await quest.save();

        changes.push({
          userId: quest.userId,
          oldPoints,
          newPoints,
        });
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('═'.repeat(60));
    console.log('                    RECALCULATION RESULTS                    ');
    console.log('═'.repeat(60) + '\n');

    if (changes.length > 0) {
      console.log('📝 Changes made:\n');
      console.log('─'.repeat(60));
      for (const change of changes) {
        const shortUserId = `${change.userId.slice(0, 10)}...${change.userId.slice(-6)}`;
        const diff = change.newPoints - change.oldPoints;
        const sign = diff > 0 ? '+' : '';
        console.log(`   User: ${shortUserId}`);
        console.log(`   Points: ${change.oldPoints} → ${change.newPoints} (${sign}${diff})`);
        console.log('');
      }
    } else {
      console.log('✨ No changes needed - all points are already correct!\n');
    }

    console.log('─'.repeat(60));
    console.log(`✅ Updated:     ${updatedCount} user(s)`);
    console.log(`⏸️  Unchanged:   ${unchangedCount} user(s)`);
    console.log(`📊 Total:       ${allQuests.length} user(s)`);
    console.log('─'.repeat(60) + '\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Recalculation failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
recalculateAllPoints();

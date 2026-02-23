/**
 * Script to aggregate user quest statistics from the userquests collection
 * Run with: node aggregate-user-quests.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

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

// Index for efficient user queries
userQuestSchema.index({ userId: 1 });

async function aggregateUserQuests() {
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

    // Get total count
    const totalUsers = await UserQuest.countDocuments();
    console.log('📊 USER QUEST STATISTICS');
    console.log('═'.repeat(50));
    console.log(`\n👥 Total Users: ${totalUsers}\n`);

    // Aggregate numeric fields
    const numericAggregation = await UserQuest.aggregate([
      {
        $group: {
          _id: null,
          totalPveDuelsCompleted: { $sum: '$pveDuelsCompleted' },
          totalPvpDuelsCompleted: { $sum: '$pvpDuelsCompleted' },
          totalExpeditionsStarted: { $sum: '$expeditionsStarted' },
          totalExpeditionsCompleted: { $sum: '$expeditionsCompleted' },
          totalPvpBattlesWon: { $sum: '$pvpBattlesWon' },
          totalPveBattlesWon: { $sum: '$pveBattlesWon' },
          totalItemsCrafted: { $sum: '$itemsCrafted' },
          totalBattlesPlayed: { $sum: '$totalBattlesPlayed' },
          totalRoundsPlayed: { $sum: '$totalRoundsPlayed' },
          totalWins: { $sum: '$totalWins' },
          totalPoints: { $sum: '$totalPoints' },
          // Wizard wins by class
          totalMageWins: { $sum: '$wizardWins.mage' },
          totalArcherWins: { $sum: '$wizardWins.archer' },
          totalDuelistWins: { $sum: '$wizardWins.duelist' },
          // Averages
          avgPveDuelsCompleted: { $avg: '$pveDuelsCompleted' },
          avgPvpDuelsCompleted: { $avg: '$pvpDuelsCompleted' },
          avgExpeditionsStarted: { $avg: '$expeditionsStarted' },
          avgExpeditionsCompleted: { $avg: '$expeditionsCompleted' },
          avgItemsCrafted: { $avg: '$itemsCrafted' },
          avgTotalBattlesPlayed: { $avg: '$totalBattlesPlayed' },
          avgTotalRoundsPlayed: { $avg: '$totalRoundsPlayed' },
          avgTotalWins: { $avg: '$totalWins' },
          avgTotalPoints: { $avg: '$totalPoints' },
        },
      },
    ]);

    // Aggregate boolean fields (count true values)
    const booleanAggregation = await UserQuest.aggregate([
      {
        $group: {
          _id: null,
          usersStartedGame: {
            $sum: { $cond: [{ $eq: ['$startGame', true] }, 1, 0] },
          },
          usersWonWithLowHp: {
            $sum: { $cond: [{ $eq: ['$wonWithLowHp', true] }, 1, 0] },
          },
          usersLeveledUpWizard: {
            $sum: { $cond: [{ $eq: ['$leveledUpWizard', true] }, 1, 0] },
          },
          usersWithFullyGearedWizard: {
            $sum: { $cond: [{ $eq: ['$hasFullyGearedWizard', true] }, 1, 0] },
          },
          usersWithUpgradedGear: {
            $sum: { $cond: [{ $eq: ['$hasUpgradedGear', true] }, 1, 0] },
          },
          usersWonWithFullHp: {
            $sum: { $cond: [{ $eq: ['$wonWithFullHp', true] }, 1, 0] },
          },
          usersWithFullSetLevelTwoGear: {
            $sum: { $cond: [{ $eq: ['$hasFullSetLevelTwoGear', true] }, 1, 0] },
          },
          usersSubmittedFeedback: {
            $sum: { $cond: [{ $eq: ['$submittedFeedback', true] }, 1, 0] },
          },
        },
      },
    ]);

    if (numericAggregation.length > 0) {
      const stats = numericAggregation[0];

      console.log('⚔️  BATTLE STATISTICS (TOTALS)');
      console.log('─'.repeat(50));
      console.log(`   PvE Duels Completed:    ${stats.totalPveDuelsCompleted}`);
      console.log(`   PvP Duels Completed:    ${stats.totalPvpDuelsCompleted}`);
      console.log(`   PvP Battles Won:        ${stats.totalPvpBattlesWon}`);
      console.log(`   PvE Battles Won:        ${stats.totalPveBattlesWon}`);
      console.log(`   Total Battles Played:   ${stats.totalBattlesPlayed}`);
      console.log(`   Total Rounds Played:    ${stats.totalRoundsPlayed}`);
      console.log(`   Total Wins:             ${stats.totalWins}`);

      console.log('\n🗺️  EXPEDITION STATISTICS (TOTALS)');
      console.log('─'.repeat(50));
      console.log(`   Expeditions Started:    ${stats.totalExpeditionsStarted}`);
      console.log(`   Expeditions Completed:  ${stats.totalExpeditionsCompleted}`);
      const completionRate =
        stats.totalExpeditionsStarted > 0
          ? ((stats.totalExpeditionsCompleted / stats.totalExpeditionsStarted) * 100).toFixed(1)
          : 0;
      console.log(`   Completion Rate:        ${completionRate}%`);

      console.log('\n🛠️  CRAFTING STATISTICS (TOTALS)');
      console.log('─'.repeat(50));
      console.log(`   Items Crafted:          ${stats.totalItemsCrafted}`);

      console.log('\n🧙 WIZARD CLASS WINS (TOTALS)');
      console.log('─'.repeat(50));
      console.log(`   Mage Wins:              ${stats.totalMageWins}`);
      console.log(`   Archer Wins:            ${stats.totalArcherWins}`);
      console.log(`   Duelist Wins:           ${stats.totalDuelistWins}`);

      console.log('\n🏆 POINTS (TOTALS)');
      console.log('─'.repeat(50));
      console.log(`   Total Points:           ${stats.totalPoints}`);

      console.log('\n📈 AVERAGES PER USER');
      console.log('─'.repeat(50));
      console.log(`   Avg PvE Duels:          ${stats.avgPveDuelsCompleted?.toFixed(2) || 0}`);
      console.log(`   Avg PvP Duels:          ${stats.avgPvpDuelsCompleted?.toFixed(2) || 0}`);
      console.log(`   Avg Expeditions Started: ${stats.avgExpeditionsStarted?.toFixed(2) || 0}`);
      console.log(`   Avg Expeditions Done:   ${stats.avgExpeditionsCompleted?.toFixed(2) || 0}`);
      console.log(`   Avg Items Crafted:      ${stats.avgItemsCrafted?.toFixed(2) || 0}`);
      console.log(`   Avg Battles Played:     ${stats.avgTotalBattlesPlayed?.toFixed(2) || 0}`);
      console.log(`   Avg Rounds Played:      ${stats.avgTotalRoundsPlayed?.toFixed(2) || 0}`);
      console.log(`   Avg Wins:               ${stats.avgTotalWins?.toFixed(2) || 0}`);
      console.log(`   Avg Points:             ${stats.avgTotalPoints?.toFixed(2) || 0}`);
    }

    if (booleanAggregation.length > 0) {
      const boolStats = booleanAggregation[0];

      console.log('\n✅ ACHIEVEMENT STATISTICS');
      console.log('─'.repeat(50));
      console.log(
        `   Started Game:           ${boolStats.usersStartedGame} (${((boolStats.usersStartedGame / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Won with Low HP:        ${boolStats.usersWonWithLowHp} (${((boolStats.usersWonWithLowHp / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Won with Full HP:       ${boolStats.usersWonWithFullHp} (${((boolStats.usersWonWithFullHp / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Leveled Up Wizard:      ${boolStats.usersLeveledUpWizard} (${((boolStats.usersLeveledUpWizard / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Fully Geared Wizard:    ${boolStats.usersWithFullyGearedWizard} (${((boolStats.usersWithFullyGearedWizard / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Upgraded Gear:          ${boolStats.usersWithUpgradedGear} (${((boolStats.usersWithUpgradedGear / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Full Set Level 2 Gear:  ${boolStats.usersWithFullSetLevelTwoGear} (${((boolStats.usersWithFullSetLevelTwoGear / totalUsers) * 100).toFixed(1)}%)`
      );
      console.log(
        `   Submitted Feedback:     ${boolStats.usersSubmittedFeedback} (${((boolStats.usersSubmittedFeedback / totalUsers) * 100).toFixed(1)}%)`
      );
    }

    // Top 10 users by points
    console.log('\n🥇 TOP 10 USERS BY POINTS');
    console.log('─'.repeat(50));
    const topUsers = await UserQuest.find()
      .sort({ totalPoints: -1 })
      .limit(10)
      .select('userId totalPoints totalWins totalBattlesPlayed');

    topUsers.forEach((user, index) => {
      const shortUserId = `${user.userId.slice(0, 10)}...${user.userId.slice(-6)}`;
      console.log(
        `   ${index + 1}. ${shortUserId} - ${user.totalPoints} pts (${user.totalWins} wins, ${user.totalBattlesPlayed} battles)`
      );
    });

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Aggregation complete!\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error aggregating user quests:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
aggregateUserQuests();


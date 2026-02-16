import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserQuestDocument = HydratedDocument<UserQuest>;

/**
 * Quest progress tracking for all tiers
 *
 * Tier 1 (5 points each):
 * - startGame: Start your game
 * - completePveDuel: Complete 1 PvE duel
 * - completePvpDuel: Complete 1 PvP duel
 * - embarkExpedition: Embark on an expedition
 * - completeExpedition: Complete an expedition
 *
 * Tier 2 (10 points each):
 * - winPvpBattle: Win 1 PvP battle
 * - winPveBattle: Win 1 PvE battle
 * - winWithLowHp: Win with <20% HP remaining
 * - levelUpWizard: Level up 1 wizard
 * - craftAndEquipGear: Craft and equip 1 piece of gear
 *
 * Tier 3 (15 points each):
 * - playTenBattles: Play 10 total battles
 * - winThreePvpBattles: Win 3 PvP battles
 * - winThreePveBattles: Win 3 PvE battles
 * - winWithEachWizard: Win a battle using each wizard (mage, archer, duelist)
 * - reachLevelTen: Reach level 10 with any wizard
 *
 * Tier 4 (20 points each):
 * - playTwentyRounds: Play 20 rounds in any match
 * - winTenTimes: Win 10 times
 * - fullyGearedWizard: Have a fully geared wizard
 * - upgradeGear: Upgrade any gear
 * - winWithFullHp: Win a battle with full HP
 *
 * Tier 5 (25 points each):
 * - reachLevelTwenty: Reach level 20 with any wizard
 * - reachLevelFiveEachWizard: Reach level 5 with each wizard
 * - winTenPvpBattles: Win 10 PvP battles
 * - winTenPveBattles: Win 10 PvE battles
 * - fullSetLevelTwoGear: Have a full set of lvl 2 gear equipped
 *
 * Tier 6 (30 points):
 * - submitFeedback: Submit feedback (external tracking)
 */

/**
 * Sub-schema for tracking wizard-specific wins
 */
@Schema({ _id: false })
export class WizardWins {
  @Prop({ type: Number, default: 0 })
  mage!: number;

  @Prop({ type: Number, default: 0 })
  archer!: number;

  @Prop({ type: Number, default: 0 })
  duelist!: number;
}

const WizardWinsSchema = SchemaFactory.createForClass(WizardWins);

/**
 * Sub-schema for tracking wizard-specific levels
 */
@Schema({ _id: false })
export class WizardLevels {
  @Prop({ type: Number, default: 1 })
  mage!: number;

  @Prop({ type: Number, default: 1 })
  archer!: number;

  @Prop({ type: Number, default: 1 })
  duelist!: number;
}

const WizardLevelsSchema = SchemaFactory.createForClass(WizardLevels);

@Schema({ timestamps: true })
export class UserQuest {
  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  // ==================== TIER 1 (5 points each) ====================

  /** Start your game - tracked on first matchmaking join */
  @Prop({ type: Boolean, default: false })
  startGame!: boolean;

  /** Complete 1 PvE duel (vs bot) */
  @Prop({ type: Number, default: 0 })
  pveDuelsCompleted!: number;

  /** Complete 1 PvP duel (vs human) */
  @Prop({ type: Number, default: 0 })
  pvpDuelsCompleted!: number;

  /** Embark on an expedition */
  @Prop({ type: Number, default: 0 })
  expeditionsStarted!: number;

  /** Complete an expedition */
  @Prop({ type: Number, default: 0 })
  expeditionsCompleted!: number;

  // ==================== TIER 2 (10 points each) ====================

  /** Win PvP battles count */
  @Prop({ type: Number, default: 0 })
  pvpBattlesWon!: number;

  /** Win PvE battles count */
  @Prop({ type: Number, default: 0 })
  pveBattlesWon!: number;

  /** Win with <20% HP remaining */
  @Prop({ type: Boolean, default: false })
  wonWithLowHp!: boolean;

  /** Track if any wizard has leveled up (from initial level) */
  @Prop({ type: Boolean, default: false })
  leveledUpWizard!: boolean;

  /** Track items crafted */
  @Prop({ type: Number, default: 0 })
  itemsCrafted!: number;

  // ==================== TIER 3 (15 points each) ====================

  /** Total battles played (PvP + PvE) */
  @Prop({ type: Number, default: 0 })
  totalBattlesPlayed!: number;

  /** Track wins per wizard type */
  @Prop({ type: WizardWinsSchema, default: () => ({}) })
  wizardWins!: WizardWins;

  /** Highest level reached per wizard */
  @Prop({ type: WizardLevelsSchema, default: () => ({}) })
  wizardLevels!: WizardLevels;

  // ==================== TIER 4 (20 points each) ====================

  /** Total rounds played across all matches */
  @Prop({ type: Number, default: 0 })
  totalRoundsPlayed!: number;

  /** Total wins (PvP + PvE) */
  @Prop({ type: Number, default: 0 })
  totalWins!: number;

  /** Has a fully geared wizard */
  @Prop({ type: Boolean, default: false })
  hasFullyGearedWizard!: boolean;

  /** Has upgraded any gear */
  @Prop({ type: Boolean, default: false })
  hasUpgradedGear!: boolean;

  /** Won a battle with full HP */
  @Prop({ type: Boolean, default: false })
  wonWithFullHp!: boolean;

  // ==================== TIER 5 (25 points each) ====================

  /** Has full set of lvl 2 gear equipped */
  @Prop({ type: Boolean, default: false })
  hasFullSetLevelTwoGear!: boolean;

  // ==================== TIER 6 (30 points) ====================

  /** Submitted feedback (external tracking) */
  @Prop({ type: Boolean, default: false })
  submittedFeedback!: boolean;

  // ==================== METADATA ====================

  /** Total points earned */
  @Prop({ type: Number, default: 0 })
  totalPoints!: number;

  /** Last updated timestamp */
  @Prop({ type: Date, default: Date.now })
  lastUpdated!: Date;

  // Timestamps (automatically managed by Mongoose)
  createdAt!: Date;
  updatedAt!: Date;
}

export const UserQuestSchema = SchemaFactory.createForClass(UserQuest);

// Index for efficient queries
UserQuestSchema.index({ userId: 1 });
UserQuestSchema.index({ totalPoints: -1 });


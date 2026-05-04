import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class SponsorInfo {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: false })
  url?: string;
}

export const SponsorInfoSchema = SchemaFactory.createForClass(SponsorInfo);

export type TournamentDocument = HydratedDocument<Tournament> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum TournamentStatus {
  Created = 'Created',
  Battle = 'Battle',
  Claiming = 'Claiming',
}

@Schema({ _id: false })
export class VerifiedState {
  @Prop({ required: true, enum: TournamentStatus })
  status!: TournamentStatus;

  @Prop({ required: true })
  battleStartSlot!: number;

  @Prop({ required: true })
  battleEndSlot!: number;

  @Prop({ required: true })
  ticketPrice!: string;

  @Prop({ required: true, type: [Number] })
  prizePercents!: number[];

  @Prop({ required: true, default: '0' })
  prizePool!: string;

  @Prop({ required: true, default: 0 })
  participantCount!: number;

  @Prop({ required: true })
  participantsRoot!: string;

  @Prop({ required: true })
  winnersRoot!: string;

  @Prop({ required: true, default: 0 })
  lastVerifiedBlock!: number;
}

export const VerifiedStateSchema = SchemaFactory.createForClass(VerifiedState);

@Schema({ _id: false })
export class WinnerInfo {
  @Prop({ required: true })
  prizeAmount!: string;

  @Prop({ required: true, default: false })
  claimed!: boolean;
}

export const WinnerInfoSchema = SchemaFactory.createForClass(WinnerInfo);

@Schema({
  timestamps: true,
  collection: 'tournaments',
  optimisticConcurrency: true,
})
export class Tournament {
  @Prop({ required: true, unique: true, index: true })
  tournamentId!: string;

  @Prop({ type: VerifiedStateSchema, required: true })
  verified!: VerifiedState;

  @Prop({ type: Map, of: Boolean, default: {} })
  participants!: Map<string, boolean>;

  @Prop({ type: Map, of: WinnerInfoSchema, default: {} })
  winners!: Map<string, WinnerInfo>;

  @Prop({ required: true })
  tournamentsRoot!: string;

  /** Display name for clients; falls back to a generated label when absent. */
  @Prop({ required: false })
  title?: string;

  /** Image URL for listings (absolute or site-relative path). */
  @Prop({ required: false })
  imageUrl?: string;

  /** Human-readable description shown in the tournament details panel. */
  @Prop({ required: false })
  description?: string;

  /** Sponsoring organizations displayed in the tournament details panel. */
  @Prop({ type: [SponsorInfoSchema], required: false, default: undefined })
  sponsors?: SponsorInfo[];
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

TournamentSchema.index({ 'verified.status': 1 });
TournamentSchema.index({ 'verified.battleEndSlot': 1, 'verified.status': 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ExpeditionStatus, IExpeditionRewardDB } from '@wizard-battle/common';

export type ExpeditionDocument = HydratedDocument<Expedition>;

@Schema({ timestamps: true })
export class Expedition {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  characterId!: string;

  @Prop({ required: true })
  characterRole!: string;

  @Prop({ required: true })
  characterImage!: string;

  @Prop({ required: true })
  locationId!: string;

  @Prop({ required: true })
  locationName!: string;

  @Prop({ type: [{ itemId: String, amount: Number }], default: [] })
  rewards!: IExpeditionRewardDB[];

  @Prop({ required: true, enum: ['active', 'completed', 'pending'], default: 'pending' })
  status!: ExpeditionStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  completesAt?: Date;

  @Prop({ required: true })
  timeToComplete!: number; // Duration in milliseconds
}

export const ExpeditionSchema = SchemaFactory.createForClass(Expedition);

// Index for efficient queries
ExpeditionSchema.index({ userId: 1, status: 1 });
ExpeditionSchema.index({ userId: 1, createdAt: -1 });


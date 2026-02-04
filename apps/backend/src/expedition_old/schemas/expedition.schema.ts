import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ExpeditionDocument = Expedition & Document;

export interface ExpeditionReward {
  itemId: string;
  amount: number;
}

@Schema({ timestamps: true })
export class Expedition {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  characterId!: string;

  @Prop({ required: true })
  locationId!: number;

  @Prop({ required: true, enum: ['active', 'completed', 'pending'] })
  status!: 'active' | 'completed' | 'pending';

  @Prop({ type: [{ itemId: String, amount: Number }], required: true })
  rewards!: ExpeditionReward[];

  @Prop({ required: true })
  startedAt!: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ required: true })
  timeToComplete!: number; // in milliseconds
}

export const ExpeditionSchema = SchemaFactory.createForClass(Expedition);

// Add index for efficient queries
ExpeditionSchema.index({ userId: 1, status: 1 });
ExpeditionSchema.index({ userId: 1, characterId: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { IExpeditionRewardDB } from '@wizard-battle/common';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ timestamps: true })
export class Location {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ type: [{ itemId: String, amount: Number }], default: [] })
  possibleRewards!: IExpeditionRewardDB[];

  @Prop({ required: true, default: 1 })
  minRewards!: number;

  @Prop({ required: true, default: 5 })
  maxRewards!: number;
}

export const LocationSchema = SchemaFactory.createForClass(Location);


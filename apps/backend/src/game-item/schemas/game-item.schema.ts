import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameItemDocument = HydratedDocument<GameItem>;

@Schema({ timestamps: true })
export class GameItem {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  rarity!: string;

  @Prop({ required: true })
  origin!: string;

  @Prop({ required: true })
  desc!: string;
}

export const GameItemSchema = SchemaFactory.createForClass(GameItem);
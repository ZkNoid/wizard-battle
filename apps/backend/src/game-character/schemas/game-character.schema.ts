import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameCharacterDocument = HydratedDocument<GameCharacter>;

@Schema({ timestamps: true })
export class GameCharacter {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 1, default: 1 })
  level!: number;

  @Prop({ required: true, index: true })
  userId!: string; // Reference to user (from auth/user module)
}

export const GameCharacterSchema = SchemaFactory.createForClass(GameCharacter);

// Index for efficient user queries
GameCharacterSchema.index({ userId: 1 });

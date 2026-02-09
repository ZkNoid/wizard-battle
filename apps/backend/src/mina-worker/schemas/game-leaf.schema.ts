import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GameLeafDocument = HydratedDocument<GameLeaf>;

/**
 * GameLeaf schema for MongoDB persistence
 * Mirrors the on-chain GameLeaf structure from mina-contracts
 */
@Schema({ timestamps: true })
export class GameLeaf {
  @Prop({ required: true, unique: true, index: true })
  gameId!: number;

  @Prop({ required: true })
  status!: number; // UInt32 - GameStatus enum value

  @Prop({ required: true, default: 0 })
  challengeDeadlineSlot!: number; // UInt32

  @Prop({ required: true })
  setupHash!: string; // Field as string

  @Prop({ required: true, default: '0' })
  resultHash!: string; // Field as string

  @Prop({ required: true, default: '0' })
  fraudHash!: string; // Field as string
}

export const GameLeafSchema = SchemaFactory.createForClass(GameLeaf);


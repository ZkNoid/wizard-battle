import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GameItem } from '../../game-item/schemas/game-item.schema';

export type UserInventoryDocument = HydratedDocument<UserInventory>;

@Schema({ timestamps: true })
export class UserInventory {
  @Prop({ required: true, index: true })
  userId!: string; // Reference to user (from auth/user module)

  @Prop({ type: Types.ObjectId, ref: 'GameItem', required: true })
  itemId!: Types.ObjectId; // Reference to GameItem

  @Prop({ required: true, default: 1, min: 1 })
  quantity!: number;

  @Prop({ default: false })
  isEquipped?: boolean;

  @Prop()
  acquiredAt?: Date;

  @Prop()
  acquiredFrom?: string; // 'crafted', 'loot', 'trade', 'drop', etc.
}

export const UserInventorySchema = SchemaFactory.createForClass(UserInventory);

// Compound index for efficient queries and uniqueness
UserInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });

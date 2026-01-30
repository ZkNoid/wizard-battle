import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { ItemAcquiredFrom } from '@wizard-battle/common';

export type UserInventoryDocument = HydratedDocument<UserInventory>;

@Schema({ timestamps: true })
export class UserInventory {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  itemId!: string; // Reference to InventoryItem.id

  @Prop({ required: true, default: 1, min: 1 })
  quantity!: number;

  @Prop({ default: false })
  isEquipped?: boolean;

  @Prop()
  equippedToWizardId?: string; // Which wizard has this equipped

  @Prop()
  acquiredAt?: Date;

  @Prop()
  acquiredFrom?: ItemAcquiredFrom;
}

export const UserInventorySchema = SchemaFactory.createForClass(UserInventory);

// Compound index for efficient queries and uniqueness
UserInventorySchema.index({ userId: 1, itemId: 1 }, { unique: true });

// Index for equipped items queries
UserInventorySchema.index({ userId: 1, isEquipped: 1 });
UserInventorySchema.index({ userId: 1, equippedToWizardId: 1 });

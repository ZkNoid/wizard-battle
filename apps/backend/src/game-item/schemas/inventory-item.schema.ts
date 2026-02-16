import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  ItemRarity,
  ItemType,
  InventoryItemWearableArmorSlot,
  IItemBuff,
  IImprovementRequirementDB,
  IWearRequirement,
} from '@wizard-battle/common';

export type InventoryItemDocument = HydratedDocument<InventoryItem>;

// Re-export types from common for convenience
export type {
  ItemRarity,
  ItemType,
  InventoryItemWearableArmorSlot,
  IItemBuff,
  IImprovementRequirementDB,
  IWearRequirement,
} from '@wizard-battle/common';

@Schema({ _id: false })
export class ItemBuff implements IItemBuff {
  @Prop()
  critChance?: string;

  @Prop()
  Accuracy?: string;

  @Prop()
  Attack?: string;

  @Prop()
  Dodge?: string;

  @Prop()
  Movement?: string;

  @Prop()
  Defence?: string;
}

@Schema({ _id: false })
export class ImprovementRequirement implements IImprovementRequirementDB {
  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  amount!: number;
}

@Schema({ _id: false })
export class WearRequirement implements IWearRequirement {
  @Prop({ required: true })
  requirement!: string;

  @Prop({ required: true })
  value!: number;
}

@Schema({ timestamps: true })
export class InventoryItem {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ required: true, enum: ['common', 'uncommon', 'rare'] })
  rarity!: ItemRarity;

  @Prop({ required: true, enum: ['armor', 'craft', 'gems'] })
  type!: ItemType;

  @Prop({ required: true, default: 1 })
  amount!: number;

  @Prop({ required: true, default: 100 })
  price!: number;

  // Armor-specific fields (optional for craft/gems items)
  @Prop({ enum: ['Orb', 'Belt', 'Ring', 'Amulet', 'Boots', 'Gloves'] })
  wearableSlot?: InventoryItemWearableArmorSlot;

  @Prop()
  level?: number;

  @Prop({ type: ItemBuff })
  buff?: ItemBuff;

  @Prop({ type: [ImprovementRequirement], default: [] })
  improvementRequirements?: ImprovementRequirement[];

  @Prop({ type: [WearRequirement], default: [] })
  wearRequirements?: WearRequirement[];
}

export const iteminventorychema = SchemaFactory.createForClass(InventoryItem);

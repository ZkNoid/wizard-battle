import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { InventoryItemWearableArmorSlot } from '@wizard-battle/common';

type CraftingType = 'crafting' | 'upgrading' | 'unifying';

export type CraftRecipeDocument = HydratedDocument<CraftRecipe>;

@Schema({ _id: false })
export class CraftRecipeIngredient {
  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  requiredAmount!: number;
}

@Schema({ timestamps: true, collection: 'craftrecipes' })
export class CraftRecipe {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ required: true, enum: ['crafting', 'upgrading', 'unifying'] })
  craftingType!: CraftingType;

  @Prop({
    required: true,
    enum: ['Orb', 'Belt', 'Ring', 'Amulet', 'Boots', 'Gloves'],
  })
  category!: InventoryItemWearableArmorSlot;

  @Prop({ required: true })
  resultItemId!: string;

  @Prop({ type: [CraftRecipeIngredient], required: true })
  ingredients!: CraftRecipeIngredient[];
}

export const CraftRecipeSchema = SchemaFactory.createForClass(CraftRecipe);

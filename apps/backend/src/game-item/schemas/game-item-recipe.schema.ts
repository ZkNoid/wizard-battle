// src/game-items/schemas/game-item-recipe.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GameItem } from './game-item.schema';

export type GameItemRecipeDocument = HydratedDocument<GameItemRecipe>;

@Schema({ timestamps: true })
export class GameItemRecipe {
  // The item that this recipe produces (e.g., "Orb")
  @Prop({ type: Types.ObjectId, ref: 'GameItem', required: true })
  resultItem!: Types.ObjectId;

  // Array of class-specific recipes
  @Prop({
    type: [
      {
        className: { type: String, required: true }, // e.g., "Sorcerer", "Archer"
        uniqueResource: { type: Types.ObjectId, ref: 'GameItem', required: true },
        specificResource: { type: Types.ObjectId, ref: 'GameItem', required: true },
        commonResource: { type: Types.ObjectId, ref: 'GameItem', required: true },
        levels: {
          type: [
            {
              level: { type: Number, required: true, min: 0, max: 5 },
              uniqueQty: { type: Number, required: true },
              specificQty: { type: Number, required: true },
              commonQty: { type: Number, required: true },
            },
          ],
          required: true,
          validate: [
            {
              validator: (levels: any[]) => levels.length === 6, // Must have exactly Lv.0 to Lv.5
              message: 'Each class must define exactly 6 levels (0–5)',
            },
          ],
        },
      },
    ],
    required: true,
  })
  classRecipes!: Array<{
    className: string;
    uniqueResource: Types.ObjectId;
    specificResource: Types.ObjectId;
    commonResource: Types.ObjectId;
    levels: Array<{
      level: number;
      uniqueQty: number;
      specificQty: number;
      commonQty: number;
    }>;
  }>;
}

export const GameItemRecipeSchema = SchemaFactory.createForClass(GameItemRecipe);
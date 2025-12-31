import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GameItemDropDocument = HydratedDocument<GameItemDrop>;

@Schema({ timestamps: true })
export class GameItemDrop {
  @Prop({ required: true, unique: true })
  locationName!: string;  // e.g., "Mount Avalon (mountain)"

  // Array of drop configs for different durations
  @Prop({
    type: [
      {
        durationHours: { type: Number, required: true }, // 1, 3, 8
        dropGroups: {
          type: [
            {
              // Type of drop group
              type: {
                type: String,
                enum: ['chance-rolls', 'guaranteed'],
                required: true,
              },

              // For 'chance-rolls': multiple attempts at % chance
              rollsCount: { type: Number }, // e.g., 5, 10, 20
              chancePercent: { type: Number }, // e.g., 10
              rarity: { type: String }, // e.g., "unique", "uncommon", "common" – or reference a rarity enum

              // For 'guaranteed': fixed quantity of specific item
              item: { type: Types.ObjectId, ref: 'GameItem' },
              quantity: { type: Number },

              // Common fields if needed
              // You can add more later (min/max quantity, etc.)
            },
          ],
          required: true,
        },
      },
    ],
    required: true,
    validate: [
      {
        validator: (durations: any[]) => new Set(durations.map(d => d.durationHours)).size === durations.length,
        message: 'Duplicate durationHours not allowed',
      },
    ],
  })
  durations!: Array<{
    durationHours: number;
    dropGroups: Array<
      | {
          type: 'chance-rolls';
          rollsCount: number;
          chancePercent: number;
          rarity: string;
        }
      | {
          type: 'guaranteed';
          item: Types.ObjectId;
          quantity: number;
        }
    >;
  }>;
}

export const GameItemDropSchema = SchemaFactory.createForClass(GameItemDrop);
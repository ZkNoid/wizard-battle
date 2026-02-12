import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { LocationBiome } from '@wizard-battle/common';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ timestamps: true })
export class Location {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ required: true, enum: ['forest', 'water', 'mountains'] })
  biome!: LocationBiome;

  @Prop({ type: [String], default: [] })
  commonRewards!: string[]; // Item IDs for common rarity items in this biome

  @Prop({ type: [String], default: [] })
  uncommonRewards!: string[]; // Item IDs for uncommon rarity items in this biome
}

export const LocationSchema = SchemaFactory.createForClass(Location);


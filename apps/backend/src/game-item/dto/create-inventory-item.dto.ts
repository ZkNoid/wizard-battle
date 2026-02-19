import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ItemRarity,
  ItemType,
  InventoryItemWearableArmorSlot,
  IItemBuff,
  IImprovementRequirementDB,
  IWearRequirement,
} from '@wizard-battle/common';

export class ItemBuffDto implements IItemBuff {
  @IsString()
  @IsOptional()
  critChance?: string;

  @IsString()
  @IsOptional()
  Accuracy?: string;

  @IsString()
  @IsOptional()
  Attack?: string;

  @IsString()
  @IsOptional()
  Dodge?: string;

  @IsString()
  @IsOptional()
  Movement?: string;

  @IsString()
  @IsOptional()
  Defence?: string;
}

export class ImprovementRequirementDto implements IImprovementRequirementDB {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  amount!: number;
}

export class WearRequirementDto implements IWearRequirement {
  @IsString()
  @IsNotEmpty()
  requirement!: string;

  @IsNotEmpty()
  value!: number | string; // number for level, string for class names
}

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  image!: string;

  @IsString()
  @IsIn(['common', 'uncommon', 'rare'])
  rarity!: ItemRarity;

  @IsString()
  @IsIn(['armor', 'craft', 'gems'])
  type!: ItemType;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  // Armor-specific fields (optional)
  @IsString()
  @IsIn(['Orb', 'Belt', 'Ring', 'Amulet', 'Boots', 'Gloves'])
  @IsOptional()
  wearableSlot?: InventoryItemWearableArmorSlot;

  @IsNumber()
  @IsOptional()
  level?: number;

  @ValidateNested()
  @Type(() => ItemBuffDto)
  @IsOptional()
  buff?: ItemBuffDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImprovementRequirementDto)
  @IsOptional()
  improvementRequirements?: ImprovementRequirementDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearRequirementDto)
  @IsOptional()
  wearRequirements?: WearRequirementDto[];
}

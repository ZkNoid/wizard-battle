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
  @IsNotEmpty()
  effect!: string;

  @IsNumber()
  value!: number;
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

  @IsNumber()
  value!: number;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemBuffDto)
  @IsOptional()
  buff?: ItemBuffDto[];

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

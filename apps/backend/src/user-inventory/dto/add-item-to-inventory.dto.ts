import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';
import type { ItemAcquiredFrom } from '@wizard-battle/common';

export class AddItemToInventoryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string; // Reference to InventoryItem.id

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsIn(['crafted', 'loot', 'trade', 'drop', 'reward', 'purchase'])
  @IsOptional()
  acquiredFrom?: ItemAcquiredFrom;
}

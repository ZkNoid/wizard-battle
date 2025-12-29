import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export enum AcquiredFrom {
  CRAFTED = 'crafted',
  LOOT = 'loot',
  DROP = 'drop',
  TRADE = 'trade',
  REWARD = 'reward',
  PURCHASE = 'purchase',
}

export class AddItemToInventoryDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsEnum(AcquiredFrom)
  @IsOptional()
  acquiredFrom?: AcquiredFrom;
}

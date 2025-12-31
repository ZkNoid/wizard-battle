import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateGameItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  rarity!: string;

  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  desc!: string;

  @IsBoolean()
  @IsOptional()
  isCraftable?: boolean; // true = can only be crafted via recipe, false = standalone resource/item (default: false)
}
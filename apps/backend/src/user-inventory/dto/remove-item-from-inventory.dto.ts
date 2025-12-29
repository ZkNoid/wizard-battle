import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class RemoveItemFromInventoryDto {
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
}

import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpdateInventoryItemDto {
  @IsBoolean()
  @IsOptional()
  isEquipped?: boolean;
}

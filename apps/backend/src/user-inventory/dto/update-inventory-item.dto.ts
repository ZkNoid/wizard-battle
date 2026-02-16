import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateInventoryItemDto {
  @IsBoolean()
  @IsOptional()
  isEquipped?: boolean;

  @IsString()
  @IsOptional()
  equippedToWizardId?: string;
}

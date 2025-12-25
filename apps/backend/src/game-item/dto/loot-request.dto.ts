import { IsIn, IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class LootRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @IsIn([1, 3, 8])
  durationHours!: 1 | 3 | 8;
}   
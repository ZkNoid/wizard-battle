import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ExpeditionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  characterId!: string;

  @IsString()
  @IsOptional()
  expeditionId?: string;
}

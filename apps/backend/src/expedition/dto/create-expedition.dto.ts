import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsIn,
} from 'class-validator';
import type { ExpeditionTimePeriod } from '@wizard-battle/common';

export class CreateExpeditionDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  characterId!: string;

  @IsString()
  @IsNotEmpty()
  characterRole!: string;

  @IsString()
  @IsNotEmpty()
  characterImage!: string;

  @IsString()
  @IsNotEmpty()
  locationId!: string;

  @IsNumber()
  @IsIn([1, 3, 24])
  timePeriod!: ExpeditionTimePeriod;
}


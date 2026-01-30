import {
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';
import type { ExpeditionStatus } from '@wizard-battle/common';

export class UpdateExpeditionDto {
  @IsString()
  @IsIn(['active', 'completed', 'pending'])
  @IsOptional()
  status?: ExpeditionStatus;
}


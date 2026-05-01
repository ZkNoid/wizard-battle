import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsNumberString,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SponsorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;
}

export class CreateTournamentDto {
  @IsNotEmpty()
  @IsString()
  tournamentId!: string;

  @IsNotEmpty()
  @IsNumberString()
  ticketPrice!: string;

  @IsNumber()
  @Min(0)
  prize1Percent!: number;

  @IsNumber()
  @Min(0)
  prize2Percent!: number;

  @IsNumber()
  @Min(0)
  prize3Percent!: number;

  @IsNumber()
  @Min(0)
  battleStartSlot!: number;

  @IsNumber()
  @Min(0)
  battleEndSlot!: number;

  @IsNotEmpty()
  @IsString()
  tournamentsRoot!: string;

  @IsOptional()
  @IsString()
  txHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorDto)
  sponsors?: SponsorDto[];
}

export class CreateTournamentResponseDto {
  tournamentId!: string;
  status!: string;
  message!: string;
}

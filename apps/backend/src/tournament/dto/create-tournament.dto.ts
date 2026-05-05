import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Max,
  Min,
  IsNumberString,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
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

  /** Per-tournament fee in basis points; mirrors the on-chain leaf snapshot. */
  @IsInt()
  @Min(0)
  @Max(5000)
  feePercent!: number;

  /** Number of slots after `battleEndSlot` during which winners may claim. */
  @IsInt()
  @Min(1)
  claimWindow!: number;

  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  prizePercents!: number[];

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

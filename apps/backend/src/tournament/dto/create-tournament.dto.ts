import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsNumberString,
  MaxLength,
} from 'class-validator';

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
  registrationStartSlot!: number;

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
}

export class CreateTournamentResponseDto {
  tournamentId!: string;
  status!: string;
  message!: string;
}

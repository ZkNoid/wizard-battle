import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimPrizeDto {
  @IsNotEmpty()
  @IsString()
  playerPubKey!: string;
}

export class ClaimPrizeResponseDto {
  operationId!: string;
  status!: string;
  message!: string;
}

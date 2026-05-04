import { IsNotEmpty, IsString } from 'class-validator';

export class BuyTicketDto {
  @IsNotEmpty()
  @IsString()
  playerPubKey!: string;
}

export class BuyTicketResponseDto {
  operationId!: string;
  status!: string;
  message!: string;
}

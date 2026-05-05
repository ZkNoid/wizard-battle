import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class SponsorFundDto {
  /**
   * Public key of the sponsor (and fee payer) signing the on-chain
   * `sponsorFund` call. Must be the same key that will sign the
   * unsigned tx returned by the proof generator.
   */
  @IsNotEmpty()
  @IsString()
  sponsorPubKey!: string;

  /** Amount to deposit into the prize pool, in nanoMINA (1 MINA = 1e9). */
  @IsNotEmpty()
  @IsNumberString()
  amount!: string;
}

export class SponsorFundResponseDto {
  operationId!: string;
  status!: string;
  message!: string;
}

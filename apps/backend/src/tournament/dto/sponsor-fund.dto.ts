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

/**
 * Body for `POST /tournament/:id/sponsor-fund/notify`.
 * Called by the admin sponsor-tournament script after the on-chain
 * `sponsorFund` tx is confirmed, so the backend can apply the mutation
 * to its verified state without going through the proof-generator queue.
 */
export class SponsorFundNotifyDto {
  @IsNotEmpty()
  @IsString()
  sponsorPubKey!: string;

  @IsNotEmpty()
  @IsNumberString()
  amount!: string;

  /** On-chain transaction hash of the confirmed sponsorFund tx. */
  @IsNotEmpty()
  @IsString()
  txHash!: string;
}

export class SponsorFundNotifyResponseDto {
  message!: string;
  tournamentId!: string;
  newPrizePool!: string;
}

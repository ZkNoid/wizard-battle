export class TournamentSponsorDto {
  name!: string;
  url?: string;
}

export class TournamentWinnerDto {
  walletAddress!: string;
  /** Prize amount in nanoMINA (string for BigInt safety). */
  prizeAmount!: string;
  claimed!: boolean;
}

export class TournamentResponseDto {
  tournamentId!: string;
  status!: string;
  battleStartSlot!: number;
  battleEndSlot!: number;
  claimDeadlineSlot!: number;
  ticketPrice!: string;
  feePercent!: number;
  prizePercents!: number[];
  prizePool!: string;
  sponsorContribution!: string;
  participantCount!: number;
  registeredPlayers!: string[];
  pendingPlayers!: string[];
  /**
   * Per-tournament winners snapshot. Empty until finalization. Each entry
   * carries the winner's wallet, prize amount (nanoMINA), and whether the
   * on-chain claim has been applied.
   */
  winners!: TournamentWinnerDto[];
  title?: string;
  imageUrl?: string;
  description?: string;
  sponsors?: TournamentSponsorDto[];
}

export class ParticipantsResponseDto {
  tournamentId!: string;
  registered!: string[];
  pending!: string[];
  total!: number;
}

export class PendingOperationResponseDto {
  id!: string;
  tournamentId!: string;
  type!: string;
  playerPubKey!: string;
  status!: string;
  txHash?: string;
  unsignedTxJson?: string;
  error?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OperationStreamEventDto {
  status!: string;
  unsignedTxJson?: string;
  txHash?: string;
  error?: string;
  updatedAt!: string;
}

export class ChainStatusResponseDto {
  connected!: boolean;
  currentSlot!: number | null;
  contractAddress!: string | null;
  proofGeneratorReady!: boolean;
}

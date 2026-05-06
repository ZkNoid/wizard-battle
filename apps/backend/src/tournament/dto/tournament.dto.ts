export class TournamentSponsorDto {
  name!: string;
  url?: string;
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

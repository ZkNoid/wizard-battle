export class TournamentResponseDto {
  tournamentId!: string;
  status!: string;
  registrationStartSlot!: number;
  battleStartSlot!: number;
  battleEndSlot!: number;
  ticketPrice!: string;
  prize1Percent!: number;
  prize2Percent!: number;
  prize3Percent!: number;
  prizePool!: string;
  participantCount!: number;
  registeredPlayers!: string[];
  pendingPlayers!: string[];
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

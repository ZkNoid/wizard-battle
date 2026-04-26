import type {
  OperationType,
  FinalizeWinnerPayload,
} from '../../schemas/pending-operation.schema.js';
import type { TournamentStatus } from '../../schemas/tournament.schema.js';

export interface OptimisticView {
  tournamentId: string;
  status: TournamentStatus;
  registrationStartSlot: number;
  battleStartSlot: number;
  battleEndSlot: number;
  ticketPrice: string;
  prize1Percent: number;
  prize2Percent: number;
  prize3Percent: number;
  prizePool: string;
  participantCount: number;
  registeredPlayers: string[];
  pendingPlayers: string[];
  title?: string;
  imageUrl?: string;
}

export interface AddPendingOperationDto {
  tournamentId: string;
  type: OperationType;
  playerPubKey: string;
  /** Required for {@link OperationType.FinalizeTournament}. */
  finalizeWinners?: FinalizeWinnerPayload[];
}

export interface CreateTournamentConfig {
  ticketPrice: string;
  prize1Percent: number;
  prize2Percent: number;
  prize3Percent: number;
  registrationStartSlot: number;
  battleStartSlot: number;
  battleEndSlot: number;
}

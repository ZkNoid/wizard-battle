import type {
  OperationType,
  FinalizeWinnerPayload,
} from '../../schemas/pending-operation.schema.js';
import type { TournamentStatus } from '../../schemas/tournament.schema.js';

export interface TournamentSponsor {
  name: string;
  url?: string;
}

export interface OptimisticView {
  tournamentId: string;
  status: TournamentStatus;
  battleStartSlot: number;
  battleEndSlot: number;
  ticketPrice: string;
  prizePercents: number[];
  prizePool: string;
  participantCount: number;
  registeredPlayers: string[];
  pendingPlayers: string[];
  title?: string;
  imageUrl?: string;
  description?: string;
  sponsors?: TournamentSponsor[];
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
  prizePercents: number[];
  battleStartSlot: number;
  battleEndSlot: number;
}

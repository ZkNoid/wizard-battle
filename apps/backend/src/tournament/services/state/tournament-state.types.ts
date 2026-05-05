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
  claimDeadlineSlot: number;
  ticketPrice: string;
  feePercent: number;
  prizePercents: number[];
  prizePool: string;
  sponsorContribution: string;
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
  /** Required for {@link OperationType.SponsorFund}: amount in nanoMINA. */
  sponsorAmount?: string;
}

export interface CreateTournamentConfig {
  ticketPrice: string;
  /** Per-tournament fee in basis points (PERCENT_BASE = 10_000). */
  feePercent: number;
  /** Number of slots after battleEndSlot during which winners may claim. */
  claimWindow: number;
  prizePercents: number[];
  battleStartSlot: number;
  battleEndSlot: number;
}

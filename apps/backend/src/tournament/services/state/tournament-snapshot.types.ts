import { TournamentStatus, WinnerInfo } from '../../schemas/tournament.schema.js';

/**
 * In-memory snapshot of every field a `TournamentLeaf` (and its child Merkle
 * maps) needs to be reconstructed off-chain.
 *
 * It mirrors {@link VerifiedState} on the document but uses native JS types
 * so we can replay zero-or-many pending mutations on top of it without ever
 * touching MongoDB. The verified-mutations service produces the same shape
 * via mongoose `.save()`; the optimistic-overlay service applies the same
 * transitions to a transient copy of this snapshot.
 *
 * Maps are deep-cloned by the overlay service so callers can mutate freely
 * without aliasing back into the persisted document.
 */
export interface TournamentSnapshot {
  status: TournamentStatus;
  battleStartSlot: number;
  battleEndSlot: number;
  claimDeadlineSlot: number;
  ticketPrice: string;
  feePercent: number;
  prizePercents: number[];
  prizePool: bigint;
  sponsorContribution: bigint;
  participantCount: number;
  participants: Map<string, boolean>;
  winners: Map<string, WinnerInfo>;
  tournamentsRoot: string;
}

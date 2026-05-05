import {
  TournamentDocument,
  TournamentStatus,
  WinnerInfo,
} from '../../schemas/tournament.schema.js';
import {
  PendingOperationDocument,
  OperationType,
  FinalizeWinnerPayload,
} from '../../schemas/pending-operation.schema.js';
import { calculatePrizeContribution } from './tournament-prize.util.js';
import { TournamentSnapshot } from './tournament-snapshot.types.js';

/**
 * Build a transient snapshot from the persisted tournament document. The
 * returned object shares no reference with the mongoose document — callers
 * may mutate the maps and primitive fields freely.
 */
export function snapshotFromDocument(
  tournament: TournamentDocument
): TournamentSnapshot {
  return {
    status: tournament.verified.status,
    battleStartSlot: tournament.verified.battleStartSlot,
    battleEndSlot: tournament.verified.battleEndSlot,
    claimDeadlineSlot: tournament.verified.claimDeadlineSlot,
    ticketPrice: tournament.verified.ticketPrice,
    feePercent: tournament.verified.feePercent,
    prizePercents: [...tournament.verified.prizePercents],
    prizePool: BigInt(tournament.verified.prizePool),
    sponsorContribution: BigInt(tournament.verified.sponsorContribution ?? '0'),
    participantCount: tournament.verified.participantCount,
    participants: new Map(tournament.participants),
    winners: cloneWinners(tournament.winners),
    tournamentsRoot: tournament.tournamentsRoot,
  };
}

function cloneWinners(
  source: Map<string, WinnerInfo> | undefined
): Map<string, WinnerInfo> {
  const cloned = new Map<string, WinnerInfo>();
  if (!source) return cloned;
  for (const [k, v] of source.entries()) {
    cloned.set(k, { prizeAmount: v.prizeAmount, claimed: v.claimed });
  }
  return cloned;
}

/**
 * Mirrors the on-chain `buyTicket` leaf transition. Idempotent: a player
 * already in the participants map is left untouched so re-applying a
 * mutation that has already been folded into verified state is a no-op.
 */
export function applyBuyTicketMutation(
  snapshot: TournamentSnapshot,
  playerPubKey: string
): TournamentSnapshot {
  if (snapshot.participants.get(playerPubKey) === true) {
    return snapshot;
  }

  const ticketPrice = BigInt(snapshot.ticketPrice);
  const prizeContribution = calculatePrizeContribution(
    ticketPrice,
    BigInt(snapshot.feePercent ?? 0)
  );

  snapshot.participants.set(playerPubKey, true);
  snapshot.participantCount += 1;
  snapshot.prizePool += prizeContribution;
  return snapshot;
}

/**
 * Mirrors the on-chain `claimPrize` leaf transition. Idempotent on
 * already-claimed entries.
 */
export function applyClaimPrizeMutation(
  snapshot: TournamentSnapshot,
  playerPubKey: string
): TournamentSnapshot {
  const winnerInfo = snapshot.winners.get(playerPubKey);
  if (!winnerInfo) {
    throw new Error(
      `Cannot apply claimPrize: player ${playerPubKey} is not in winners map`
    );
  }
  if (winnerInfo.claimed) {
    return snapshot;
  }

  const prizeAmount = BigInt(winnerInfo.prizeAmount);
  if (snapshot.prizePool < prizeAmount) {
    throw new Error(
      `Cannot apply claimPrize: prize ${prizeAmount} exceeds pool ${snapshot.prizePool}`
    );
  }

  snapshot.winners.set(playerPubKey, {
    prizeAmount: winnerInfo.prizeAmount,
    claimed: true,
  });
  snapshot.prizePool -= prizeAmount;
  return snapshot;
}

/**
 * Mirrors the on-chain `sponsorFund` leaf transition.
 */
export function applySponsorFundMutation(
  snapshot: TournamentSnapshot,
  amount: string | bigint
): TournamentSnapshot {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount);
  if (value <= 0n) {
    throw new Error(`Cannot apply sponsorFund: amount must be > 0 (got ${value})`);
  }
  snapshot.prizePool += value;
  snapshot.sponsorContribution += value;
  return snapshot;
}

/**
 * Mirrors the on-chain `finalizeTournament` leaf transition: status →
 * Claiming, winners root rebuilt from supplied payload, prizePool clamped
 * to total allocated (matches the contract's admin-refund of the
 * remainder).
 */
export function applyFinalizeTournamentMutation(
  snapshot: TournamentSnapshot,
  rows: FinalizeWinnerPayload[] | undefined
): TournamentSnapshot {
  if (snapshot.status === TournamentStatus.Claiming) {
    return snapshot;
  }
  if (snapshot.status !== TournamentStatus.Battle) {
    throw new Error(
      `Cannot apply finalizeTournament from status ${snapshot.status}`
    );
  }
  if (!rows?.length) {
    throw new Error('Cannot apply finalizeTournament: empty winners payload');
  }

  const sorted = [...rows].sort((a, b) => a.place - b.place);
  const winners = new Map<string, WinnerInfo>();
  let totalAllocated = 0n;
  for (const w of sorted) {
    const prizeBn = BigInt(w.prizeAmount);
    if (prizeBn < 0n) {
      throw new Error(
        `Cannot apply finalizeTournament: negative prize for ${w.publicKey}`
      );
    }
    totalAllocated += prizeBn;
    winners.set(w.publicKey, {
      prizeAmount: w.prizeAmount,
      claimed: false,
    });
  }
  if (totalAllocated > snapshot.prizePool) {
    throw new Error(
      `Cannot apply finalizeTournament: prizes ${totalAllocated} exceed pool ${snapshot.prizePool}`
    );
  }

  snapshot.winners = winners;
  snapshot.status = TournamentStatus.Claiming;
  snapshot.prizePool = totalAllocated;
  return snapshot;
}

/**
 * Mirrors the on-chain `recoverUnclaimed` leaf transition.
 */
export function applyRecoverUnclaimedMutation(
  snapshot: TournamentSnapshot
): TournamentSnapshot {
  if (snapshot.status === TournamentStatus.Settled) {
    return snapshot;
  }
  if (snapshot.status !== TournamentStatus.Claiming) {
    throw new Error(
      `Cannot apply recoverUnclaimed from status ${snapshot.status}`
    );
  }
  snapshot.status = TournamentStatus.Settled;
  snapshot.prizePool = 0n;
  return snapshot;
}

/**
 * Dispatch a single pending operation onto a snapshot. Returns the same
 * snapshot reference (mutations are in place) so callers can chain.
 */
export function applyOperationToSnapshot(
  snapshot: TournamentSnapshot,
  op: PendingOperationDocument
): TournamentSnapshot {
  switch (op.type) {
    case OperationType.BuyTicket:
      return applyBuyTicketMutation(snapshot, op.playerPubKey);
    case OperationType.ClaimPrize:
      return applyClaimPrizeMutation(snapshot, op.playerPubKey);
    case OperationType.SponsorFund:
      if (!op.sponsorAmount) {
        throw new Error(
          `SponsorFund operation ${op._id} is missing sponsorAmount`
        );
      }
      return applySponsorFundMutation(snapshot, op.sponsorAmount);
    case OperationType.FinalizeTournament:
      return applyFinalizeTournamentMutation(snapshot, op.finalizeWinners);
    case OperationType.RecoverUnclaimed:
      return applyRecoverUnclaimedMutation(snapshot);
    default:
      throw new Error(`Unknown operation type: ${op.type as string}`);
  }
}

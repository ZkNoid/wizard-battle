import {
  TOURNAMENT_BASIS_POINTS_DIVISOR,
  TOURNAMENT_PLATFORM_FEE_BASIS_POINTS,
} from './tournament-state.constants.js';

/**
 * Compute the prize-pool slice of a single ticket sale.
 *
 * Pass the leaf-locked `feePercent` (basis points) to mirror the on-chain
 * formula `prizeContribution = ticketPrice - ticketPrice * feePercent / 10000`.
 *
 * If a fee override is not provided we fall back to the historical default —
 * but new code paths should always pass the per-tournament value so we can
 * never drift away from the contract's snapshot.
 */
export function calculatePrizeContribution(
  ticketPrice: bigint,
  feeBasisPoints: bigint = TOURNAMENT_PLATFORM_FEE_BASIS_POINTS
): bigint {
  return (
    ticketPrice -
    (ticketPrice * feeBasisPoints) / TOURNAMENT_BASIS_POINTS_DIVISOR
  );
}

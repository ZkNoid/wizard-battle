import {
  TOURNAMENT_BASIS_POINTS_DIVISOR,
  TOURNAMENT_PLATFORM_FEE_BASIS_POINTS,
} from './tournament-state.constants.js';

export function calculatePrizeContribution(ticketPrice: bigint): bigint {
  return (
    ticketPrice -
    (ticketPrice * TOURNAMENT_PLATFORM_FEE_BASIS_POINTS) /
      TOURNAMENT_BASIS_POINTS_DIVISOR
  );
}

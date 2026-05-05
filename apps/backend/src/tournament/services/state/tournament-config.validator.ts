import { BadRequestException } from '@nestjs/common';
import type { CreateTournamentConfig } from './tournament-state.types.js';

const NUM_WINNERS = 10;
const PERCENT_BASE = 10_000;
const MAX_FEE_PERCENT = 5_000; // 50%

export function validateCreateTournamentConfig(
  config: CreateTournamentConfig
): void {
  try {
    const ticketPrice = BigInt(config.ticketPrice);
    if (ticketPrice <= 0n) {
      throw new BadRequestException('Ticket price must be positive');
    }
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException('Invalid ticket price format');
  }

  if (
    !Number.isInteger(config.feePercent) ||
    config.feePercent < 0 ||
    config.feePercent > MAX_FEE_PERCENT
  ) {
    throw new BadRequestException(
      `feePercent must be an integer in [0, ${MAX_FEE_PERCENT}] basis points`
    );
  }

  if (!Number.isInteger(config.claimWindow) || config.claimWindow <= 0) {
    throw new BadRequestException(
      'claimWindow must be a positive integer (slots)'
    );
  }

  if (
    !Array.isArray(config.prizePercents) ||
    config.prizePercents.length !== NUM_WINNERS
  ) {
    throw new BadRequestException(
      `prizePercents must be an array of exactly ${NUM_WINNERS} values`
    );
  }

  if (config.prizePercents.some((p) => p < 0)) {
    throw new BadRequestException('Prize percentages cannot be negative');
  }

  // Contract enforces sum === PERCENT_BASE; validate exactly to surface
  // misconfiguration before paying for proof generation.
  const totalPrizePercent = config.prizePercents.reduce(
    (sum, p) => sum + p,
    0
  );
  if (totalPrizePercent !== PERCENT_BASE) {
    throw new BadRequestException(
      `prizePercents must sum to exactly ${PERCENT_BASE} basis points (got ${totalPrizePercent})`
    );
  }

  if (config.battleStartSlot < 0) {
    throw new BadRequestException('Battle start slot cannot be negative');
  }
  if (config.battleEndSlot <= config.battleStartSlot) {
    throw new BadRequestException(
      'Battle end slot must be after battle start slot'
    );
  }
}

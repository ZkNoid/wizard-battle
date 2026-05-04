import { BadRequestException } from '@nestjs/common';
import type { CreateTournamentConfig } from './tournament-state.types.js';

const NUM_WINNERS = 10;

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

  if (!Array.isArray(config.prizePercents) || config.prizePercents.length !== NUM_WINNERS) {
    throw new BadRequestException(
      `prizePercents must be an array of exactly ${NUM_WINNERS} values`
    );
  }

  if (config.prizePercents.some((p) => p < 0)) {
    throw new BadRequestException('Prize percentages cannot be negative');
  }

  const totalPrizePercent = config.prizePercents.reduce((sum, p) => sum + p, 0);
  if (totalPrizePercent > 10000) {
    throw new BadRequestException(
      `Prize percentages sum to ${totalPrizePercent}, must not exceed 10000 (100.00%)`
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

import { BadRequestException } from '@nestjs/common';
import type { CreateTournamentConfig } from './tournament-state.types.js';

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

  const totalPrizePercent =
    config.prize1Percent + config.prize2Percent + config.prize3Percent;
  if (totalPrizePercent > 10000) {
    throw new BadRequestException(
      `Prize percentages sum to ${totalPrizePercent}%, must not exceed 100%`
    );
  }
  if (
    config.prize1Percent < 0 ||
    config.prize2Percent < 0 ||
    config.prize3Percent < 0
  ) {
    throw new BadRequestException('Prize percentages cannot be negative');
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

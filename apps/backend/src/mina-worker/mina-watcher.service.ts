import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MinaStateService } from "./mina-state.service";


@Injectable()
export class MinaWatcherService {
  private readonly logger = new Logger(MinaWatcherService.name);

  constructor(
    private readonly minaStateService: MinaStateService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async watchMina() {
    this.logger.log('Watching Mina for finalized games...');

    const currentSlot = this.minaStateService.getCurrentSlot();
    if (!currentSlot) {
      this.logger.warn('Current slot not yet initialized, skipping...');
      return;
    }

    const awaitingFinalizationGames = await this.minaStateService.getAwaitingFinalizationGames();
    const currentSlotNumber = Number(currentSlot.toBigint());
    const readyForFinalizationGames = awaitingFinalizationGames.filter(
      (game) =>
        game.status === 'awaiting_challenge' &&
        game.challengeDeadlineSlot &&
        game.challengeDeadlineSlot <= currentSlotNumber,
    );

    for (const game of readyForFinalizationGames) {
      await this.minaStateService.recordGameFinalized(game.gameId, false);
    }
  }
}
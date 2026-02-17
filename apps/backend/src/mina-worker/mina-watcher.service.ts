import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MinaStateService } from "./mina-state.service";
import { MinaSubmitterService } from "./mina-submitter.service";


@Injectable()
export class MinaWatcherService {
  private readonly logger = new Logger(MinaWatcherService.name);

  constructor(
    private readonly minaStateService: MinaStateService,
    private readonly minaSubmitterService: MinaSubmitterService,
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
      try {
        this.logger.log(`Finalizing game ${game.gameId} on-chain...`);

        // Get witness for the game
        const witness = await this.minaStateService.getWitnessForGame(game.gameId);

        // Submit proveByTimeout transaction to finalize on-chain
        const txHash = await this.minaSubmitterService.submitProveByTimeout(
          game.gameId,
          game.challengeDeadlineSlot!,
          game.setupHash,
          game.resultHash!,
          witness,
        );

        this.logger.log(`Game ${game.gameId} finalized on-chain. TX: ${txHash}`);

        // Update local state after successful on-chain finalization
        await this.minaStateService.recordGameFinalized(game.gameId, false);
      } catch (error) {
        this.logger.error(`Failed to finalize game ${game.gameId}:`, error);
        // Continue with other games even if one fails
      }
    }
  }
}
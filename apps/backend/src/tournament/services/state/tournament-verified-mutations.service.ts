import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../../schemas/tournament.schema.js';
import type { PendingOperationDocument } from '../../schemas/pending-operation.schema.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { calculatePrizeContribution } from './tournament-prize.util.js';

@Injectable()
export class TournamentVerifiedMutationsService {
  private readonly logger = new Logger(TournamentVerifiedMutationsService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    private readonly merkleService: MerkleService
  ) {}

  private async requireTournament(
    tournamentId: string,
    notFoundMessage: string
  ): Promise<TournamentDocument> {
    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();
    if (!tournament) {
      throw new NotFoundException(notFoundMessage);
    }
    return tournament;
  }

  async applyBuyTicketToVerified(
    tournamentId: string,
    playerPubKey: string
  ): Promise<void> {
    const tournament = await this.requireTournament(
      tournamentId,
      `Cannot apply buyTicket: Tournament ${tournamentId} not found`
    );

    if (tournament.participants.get(playerPubKey) === true) {
      this.logger.warn(
        `buyTicket for ${playerPubKey} already applied to tournament ${tournamentId}, skipping`
      );
      return;
    }

    tournament.participants.set(playerPubKey, true);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    // Mirror contract math: use the leaf-locked feePercent.
    const prizeContribution = calculatePrizeContribution(
      ticketPrice,
      BigInt(tournament.verified.feePercent ?? 0)
    );

    tournament.verified.prizePool = (
      BigInt(tournament.verified.prizePool) + prizeContribution
    ).toString();
    tournament.verified.participantCount += 1;

    const participantsMap = this.merkleService.buildParticipantsMap(
      tournament.participants
    );
    tournament.verified.participantsRoot = participantsMap
      .getRoot()
      .toString();

    await tournament.save();
    this.logger.log(
      `Applied buyTicket for ${playerPubKey} to tournament ${tournamentId}`
    );
  }

  async applyClaimPrizeToVerified(
    tournamentId: string,
    playerPubKey: string
  ): Promise<void> {
    const tournament = await this.requireTournament(
      tournamentId,
      `Cannot apply claimPrize: Tournament ${tournamentId} not found`
    );

    const winnerInfo = tournament.winners?.get(playerPubKey);
    if (!winnerInfo) {
      throw new NotFoundException(
        `Cannot apply claimPrize: Player ${playerPubKey} is not a winner`
      );
    }

    if (winnerInfo.claimed) {
      this.logger.warn(
        `claimPrize for ${playerPubKey} already applied to tournament ${tournamentId}, skipping`
      );
      return;
    }

    // Mirror the on-chain `prizePool.sub(prizeAmount)` so the off-chain leaf
    // hash stays in sync with the contract; otherwise every subsequent claim
    // proof fails because the witness is computed against a stale leaf.
    // Validate before mutating any state so an inconsistent prize amount
    // surfaces as a clean BadRequestException instead of partially-applied
    // saves or downstream merkle errors.
    const prizeAmount = BigInt(winnerInfo.prizeAmount);
    const currentPool = BigInt(tournament.verified.prizePool);
    const remaining = currentPool - prizeAmount;
    if (remaining < 0n) {
      throw new BadRequestException(
        `Cannot apply claimPrize: prize ${prizeAmount} exceeds remaining pool ${currentPool}`
      );
    }

    winnerInfo.claimed = true;
    tournament.winners.set(playerPubKey, winnerInfo);

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();
    tournament.verified.prizePool = remaining.toString();

    await tournament.save();
    this.logger.log(
      `Applied claimPrize for ${playerPubKey} in tournament ${tournamentId} (remaining pool ${remaining})`
    );
  }

  async applyFinalizeTournamentToVerified(
    op: PendingOperationDocument
  ): Promise<void> {
    const { tournamentId } = op;
    const rows = op.finalizeWinners;
    if (!rows?.length) {
      throw new BadRequestException(
        `Operation ${op._id} is missing finalizeWinners snapshot`
      );
    }

    const tournament = await this.requireTournament(
      tournamentId,
      `Cannot apply finalizeTournament: Tournament ${tournamentId} not found`
    );

    if (tournament.verified.status === TournamentStatus.Claiming) {
      this.logger.warn(
        `finalizeTournament for ${tournamentId} already applied, skipping`
      );
      return;
    }

    if (tournament.verified.status !== TournamentStatus.Battle) {
      throw new BadRequestException(
        `Cannot finalize from status ${tournament.verified.status}`
      );
    }

    const sorted = [...rows].sort((a, b) => a.place - b.place);
    const winners = new Map<string, { prizeAmount: string; claimed: boolean }>();
    let totalAllocated = 0n;
    for (const w of sorted) {
      const prizeBn = BigInt(w.prizeAmount);
      if (prizeBn < 0n) {
        throw new BadRequestException(
          `Cannot apply finalizeTournament: negative prize for ${w.publicKey}`
        );
      }
      totalAllocated += prizeBn;
      winners.set(w.publicKey, {
        prizeAmount: w.prizeAmount,
        claimed: false,
      });
    }

    const currentPool = BigInt(tournament.verified.prizePool);
    if (totalAllocated > currentPool) {
      throw new BadRequestException(
        `Cannot apply finalizeTournament: prizes ${totalAllocated} exceed pool ${currentPool}`
      );
    }

    tournament.winners = winners;

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();
    tournament.verified.status = TournamentStatus.Claiming;
    // Contract sets `prizePool = totalAllocated` and refunds the remainder to
    // admin in the same finalize tx; mirror that or every subsequent claim
    // fails because the off-chain leaf hash drifts.
    tournament.verified.prizePool = totalAllocated.toString();

    await tournament.save();
    this.logger.log(
      `Applied finalizeTournament for tournament ${tournamentId} (allocated ${totalAllocated} of ${currentPool})`
    );
  }

  async applySponsorFundToVerified(
    tournamentId: string,
    sponsorAmount: string
  ): Promise<void> {
    let amount: bigint;
    try {
      amount = BigInt(sponsorAmount);
    } catch {
      throw new BadRequestException(
        `Cannot apply sponsorFund: amount ${sponsorAmount} is not numeric`
      );
    }
    if (amount <= 0n) {
      throw new BadRequestException(
        `Cannot apply sponsorFund: amount must be > 0 (got ${amount})`
      );
    }

    const tournament = await this.requireTournament(
      tournamentId,
      `Cannot apply sponsorFund: Tournament ${tournamentId} not found`
    );

    const previousPool = BigInt(tournament.verified.prizePool);
    const previousSponsor = BigInt(
      tournament.verified.sponsorContribution ?? '0'
    );

    tournament.verified.prizePool = (previousPool + amount).toString();
    tournament.verified.sponsorContribution = (
      previousSponsor + amount
    ).toString();

    await tournament.save();
    this.logger.log(
      `Applied sponsorFund of ${amount} to tournament ${tournamentId} (new pool ${tournament.verified.prizePool})`
    );
  }

  /**
   * Idempotently mark a tournament as Settled with an empty pool. Mirrors
   * the on-chain `recoverUnclaimed` which sweeps the remaining `prizePool`
   * to admin and stamps the leaf as Settled.
   */
  async applyRecoverUnclaimedToVerified(tournamentId: string): Promise<void> {
    const tournament = await this.requireTournament(
      tournamentId,
      `Cannot apply recoverUnclaimed: Tournament ${tournamentId} not found`
    );

    if (tournament.verified.status === TournamentStatus.Settled) {
      this.logger.warn(
        `recoverUnclaimed for ${tournamentId} already applied, skipping`
      );
      return;
    }

    if (tournament.verified.status !== TournamentStatus.Claiming) {
      throw new BadRequestException(
        `Cannot apply recoverUnclaimed from status ${tournament.verified.status}`
      );
    }

    tournament.verified.status = TournamentStatus.Settled;
    tournament.verified.prizePool = '0';

    await tournament.save();
    this.logger.log(
      `Applied recoverUnclaimed for tournament ${tournamentId}`
    );
  }
}

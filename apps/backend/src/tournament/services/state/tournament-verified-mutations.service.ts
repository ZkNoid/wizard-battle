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
    const prizeContribution = calculatePrizeContribution(ticketPrice);

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

    winnerInfo.claimed = true;
    tournament.winners.set(playerPubKey, winnerInfo);

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();

    await tournament.save();
    this.logger.log(
      `Applied claimPrize for ${playerPubKey} in tournament ${tournamentId}`
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
    for (const w of sorted) {
      winners.set(w.publicKey, {
        prizeAmount: w.prizeAmount,
        claimed: false,
      });
    }
    tournament.winners = winners;

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();
    tournament.verified.status = TournamentStatus.Claiming;

    await tournament.save();
    this.logger.log(`Applied finalizeTournament for tournament ${tournamentId}`);
  }
}

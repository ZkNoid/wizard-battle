import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TournamentMatch,
  TournamentMatchDocument,
} from '../schemas/tournament-match.schema.js';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../schemas/tournament.schema.js';

/**
 * Lightweight service for tournament match result persistence and validation.
 * Injected into GameSessionGateway and MatchmakingService via TournamentResultsModule.
 *
 * Tournament rooms are identified by the "t-" prefix in their roomId.
 */
@Injectable()
export class TournamentResultRecorderService {
  private readonly logger = new Logger(TournamentResultRecorderService.name);

  constructor(
    @InjectModel(TournamentMatch.name)
    private readonly tournamentMatchModel: Model<TournamentMatchDocument>,
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>
  ) {}

  async validateParticipant(
    tournamentId: string,
    walletAddress: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();
    if (!tournament) {
      return { valid: false, reason: 'Tournament not found' };
    }
    if (tournament.verified.status !== TournamentStatus.Battle) {
      return { valid: false, reason: 'Tournament is not in Battle phase' };
    }
    if (!tournament.participants.get(walletAddress)) {
      return {
        valid: false,
        reason: 'You are not a registered participant in this tournament',
      };
    }
    return { valid: true };
  }

  isTournamentRoom(roomId: string): boolean {
    return roomId.startsWith('t-');
  }

  extractTournamentId(roomId: string): string | null {
    if (!this.isTournamentRoom(roomId)) return null;
    const parts = roomId.split('-');
    return parts.length >= 2 ? (parts[1] ?? null) : null;
  }

  async recordResult(params: {
    roomId: string;
    winnerId: string;
    loserId: string;
    winnerPlayerId: string;
    loserPlayerId: string;
    rounds: number;
    surrendered: boolean;
  }): Promise<void> {
    const tournamentId = this.extractTournamentId(params.roomId);
    if (!tournamentId) return;

    try {
      await this.tournamentMatchModel.create({
        tournamentId,
        ...params,
      });
      this.logger.log(
        `Recorded tournament match: ${params.winnerId} beat ${params.loserId} in tournament ${tournamentId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to record tournament match result for room ${params.roomId}`,
        error
      );
    }
  }

  async getPairGameCount(
    tournamentId: string,
    walletA: string,
    walletB: string
  ): Promise<number> {
    return this.tournamentMatchModel.countDocuments({
      tournamentId,
      $or: [
        { winnerId: walletA, loserId: walletB },
        { winnerId: walletB, loserId: walletA },
      ],
    });
  }
}

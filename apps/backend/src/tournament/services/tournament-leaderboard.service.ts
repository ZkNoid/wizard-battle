import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TournamentMatch,
  TournamentMatchDocument,
} from '../schemas/tournament-match.schema.js';
import { TournamentStateService } from './tournament-state.service.js';
import { ITournamentLeaderboardEntry } from '../../../../common/types/tournament-matchmaking.types.js';

@Injectable()
export class TournamentLeaderboardService {
  private readonly logger = new Logger(TournamentLeaderboardService.name);

  constructor(
    @InjectModel(TournamentMatch.name)
    private readonly tournamentMatchModel: Model<TournamentMatchDocument>,
    private readonly tournamentStateService: TournamentStateService
  ) {}

  /**
   * Aggregates match results for a tournament into a ranked leaderboard.
   * Ranking is by win rate (wins / total games), descending.
   */
  async getLeaderboard(
    tournamentId: string
  ): Promise<ITournamentLeaderboardEntry[]> {
    const winAgg = await this.tournamentMatchModel.aggregate([
      { $match: { tournamentId } },
      { $group: { _id: '$winnerId', wins: { $sum: 1 } } },
    ]);

    const lossAgg = await this.tournamentMatchModel.aggregate([
      { $match: { tournamentId } },
      { $group: { _id: '$loserId', losses: { $sum: 1 } } },
    ]);

    const winMap = new Map<string, number>();
    for (const row of winAgg) {
      winMap.set(row._id, row.wins);
    }

    const lossMap = new Map<string, number>();
    for (const row of lossAgg) {
      lossMap.set(row._id, row.losses);
    }

    const allPlayers = new Set([...winMap.keys(), ...lossMap.keys()]);

    const entries: Omit<ITournamentLeaderboardEntry, 'place' | 'prize'>[] = [];
    for (const wallet of allPlayers) {
      const wins = winMap.get(wallet) ?? 0;
      const losses = lossMap.get(wallet) ?? 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? wins / totalGames : 0;

      entries.push({ walletAddress: wallet, wins, losses, totalGames, winRate });
    }

    entries.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.totalGames - b.totalGames;
    });

    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);
    const prizePool = tournament
      ? BigInt(tournament.verified.prizePool)
      : BigInt(0);
    const percents = tournament
      ? [
          tournament.verified.prize1Percent,
          tournament.verified.prize2Percent,
          tournament.verified.prize3Percent,
        ]
      : [0, 0, 0];

    return entries.map((entry, idx) => {
      const place = idx + 1;
      const prizePercent = percents[idx] ?? 0;
      const prizeAmount =
        prizePool > 0n && prizePercent > 0
          ? Number((prizePool * BigInt(prizePercent)) / 100n)
          : 0;

      const prize: ITournamentLeaderboardEntry['prize'] =
        prizeAmount > 0
          ? [{ type: 'currency', currency: 'MINA', amount: prizeAmount }]
          : [];

      return {
        ...entry,
        place,
        prize,
      };
    });
  }

  /**
   * Returns the top N winners for finalization.
   * Reuses getLeaderboard() which already computes prizes.
   */
  async getTopWinners(
    tournamentId: string,
    topN: number = 3
  ): Promise<
    { publicKey: string; prizeAmount: string; place: 1 | 2 | 3 }[]
  > {
    const leaderboard = await this.getLeaderboard(tournamentId);

    return leaderboard
      .slice(0, topN)
      .filter((e) => e.totalGames > 0 && e.place <= 3)
      .map((entry) => {
        const totalPrize = entry.prize.reduce((sum, p) => sum + p.amount, 0);
        return {
          publicKey: entry.walletAddress,
          prizeAmount: String(totalPrize),
          place: entry.place as 1 | 2 | 3,
        };
      });
  }

  async getMatchCount(tournamentId: string): Promise<number> {
    return this.tournamentMatchModel.countDocuments({ tournamentId });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TournamentMatch,
  TournamentMatchDocument,
} from '../../schemas/tournament-match.schema.js';
import { TournamentStateService } from '../state/tournament-state.service.js';
import { ITournamentLeaderboardEntry } from '../../../../../common/types/tournament-matchmaking.types.js';

/** Ranking score: baseline 100 plus net wins, floored at 0. */
export function tournamentLeaderboardScore(
  wins: number,
  losses: number
): number {
  return Math.max(0, 100 + wins - losses);
}

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
   * Includes registered participants who have no recorded matches (0/0).
   * Ranking by {@link tournamentLeaderboardScore} (desc), then wins, fewer
   * losses, wallet — so an idle registrant (100) can rank above a losing record.
   */
  async getLeaderboard(
    tournamentId: string
  ): Promise<ITournamentLeaderboardEntry[]> {
    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);

    const registeredWallets =
      tournament !== null
        ? Array.from(tournament.participants.keys()).filter(
            (key) => tournament.participants.get(key) === true
          )
        : [];

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

    const allPlayers = new Set<string>([
      ...registeredWallets,
      ...winMap.keys(),
      ...lossMap.keys(),
    ]);

    const entries: Omit<ITournamentLeaderboardEntry, 'place' | 'prize'>[] = [];
    for (const wallet of allPlayers) {
      const wins = winMap.get(wallet) ?? 0;
      const losses = lossMap.get(wallet) ?? 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? wins / totalGames : 0;
      const score = tournamentLeaderboardScore(wins, losses);

      entries.push({
        walletAddress: wallet,
        wins,
        losses,
        totalGames,
        winRate,
        score,
      });
    }

    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.walletAddress.localeCompare(b.walletAddress);
    });
    const prizePool = tournament
      ? BigInt(tournament.verified.prizePool)
      : BigInt(0);
    const percents = tournament?.verified.prizePercents ?? [];

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
    topN: number = 10
  ): Promise<{ publicKey: string; prizeAmount: string; place: number }[]> {
    const leaderboard = await this.getLeaderboard(tournamentId);

    return leaderboard
      .slice(0, topN)
      .filter((e) => e.totalGames > 0)
      .map((entry) => {
        const totalPrize = entry.prize.reduce((sum, p) => sum + p.amount, 0);
        return {
          publicKey: entry.walletAddress,
          prizeAmount: String(totalPrize),
          place: entry.place,
        };
      });
  }

  async getMatchCount(tournamentId: string): Promise<number> {
    return this.tournamentMatchModel.countDocuments({ tournamentId });
  }
}

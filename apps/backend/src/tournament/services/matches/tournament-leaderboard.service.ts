import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TournamentMatch,
  TournamentMatchDocument,
} from '../../schemas/tournament-match.schema.js';
import { TournamentStateService } from '../state/tournament-state.service.js';
import { ITournamentLeaderboardEntry } from '../../../../../common/types/tournament-matchmaking.types.js';

/**
 * Mirror of TournamentManager.PERCENT_BASE — kept in sync with the contract.
 * `verified.prizePercents` are stored as basis points so that `sum === PERCENT_BASE`.
 */
const PERCENT_BASE = 10_000;

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
      : 0n;
    const percents = tournament?.verified.prizePercents ?? [];

    return entries.map((entry, idx) => {
      const place = idx + 1;
      const prizePercent = percents[idx] ?? 0;
      // prizePercents are basis points (PERCENT_BASE = 10_000 in TournamentManager).
      const prizeAmountBn =
        prizePool > 0n && prizePercent > 0
          ? (prizePool * BigInt(prizePercent)) / BigInt(PERCENT_BASE)
          : 0n;

      const prize: ITournamentLeaderboardEntry['prize'] =
        prizeAmountBn > 0n
          ? [
              {
                type: 'currency',
                currency: 'MINA',
                // Frontend type is `number`; cast safely from BigInt.
                amount: Number(prizeAmountBn),
              },
            ]
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
   *
   * IMPORTANT: pass NUM_WINNERS (10) — anything smaller leaves prize-pool
   * money trapped in the contract because the contract enforces only
   * `totalPrizes <= prizePool`, never the inverse. The leaf percentages are
   * authored to sum to PERCENT_BASE (10_000 bp) across all 10 places.
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
        // Sum prize entries as BigInt to avoid float drift on large pools.
        const totalPrize = entry.prize.reduce(
          (sum, p) => sum + BigInt(p.amount),
          0n
        );
        return {
          publicKey: entry.walletAddress,
          prizeAmount: totalPrize.toString(),
          place: entry.place,
        };
      });
  }

  async getMatchCount(tournamentId: string): Promise<number> {
    return this.tournamentMatchModel.countDocuments({ tournamentId });
  }
}

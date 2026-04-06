import { IAddToQueue } from './matchmaking.types';

export interface ITournamentAddToQueue extends IAddToQueue {
  tournamentId: string;
}

export interface ITournamentLeaderboardEntry {
  place: number;
  walletAddress: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  prize: { type: 'currency'; currency: string; amount: number }[];
}

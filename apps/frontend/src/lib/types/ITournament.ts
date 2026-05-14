/** Chain-time estimates when we have a live slot anchor (see tournament store). */
export interface ITournamentScheduleTimes {
  battleStartsAtMs: number;
  battleEndsAtMs: number;
}

export interface ITournament {
  id: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  /** Present when chain status provides anchor; enables date+time UI and accurate countdown. */
  scheduleTimes?: ITournamentScheduleTimes;
  prizePool: ITournamentAsset[];

  ticketCost: ITournamentAsset | null;

  sponsors: ITournamentSponsor[];

  imageURL: string;
  description?: string;

  /** Server-reported participant count. */
  participantCount: number;
  startDate: string;

  status: 'upcoming' | 'active' | 'ended';
  /**
   * - `not-joined`   — wallet absent or not registered
   * - `pending`      — buy-ticket op queued/proving/submitted, not yet on-chain
   * - `got-ticket`   — registered on-chain, no result yet
   * - `joined`       — reserved (in-flight matchmaking placeholder)
   * - `lost`         — registered, tournament ended, not in winners list
   * - `won`          — in winners list, prize not yet claimed
   * - `claimed`      — in winners list, claim already applied on-chain
   */
  userStatus:
    | 'not-joined'
    | 'got-ticket'
    | 'joined'
    | 'won'
    | 'lost'
    | 'pending'
    | 'claimed';
}

export type ITournamentAsset =
  | ITournamentCurrencyAsset
  | ITournamentInventoryAsset;

export interface ITournamentCurrencyAsset {
  type: 'currency';
  currency: 'gold' | 'usdc' | 'mina';
  amount: number;
}

export interface ITournamentInventoryAsset {
  type: 'inventory-item';
  itemId: string;
  quantity: number;
}

export interface ITournamentSponsor {
  name: string;
  url?: string;
}

export interface ITournamentLeaderboardItem {
  place: number;
  walletAddress: string;
  wins: number;
  losses: number;
  score: number;
  prize: ITournamentAsset[];
}

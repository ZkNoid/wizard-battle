/** Chain-time estimates when we have a live slot anchor (see tournament store). */
export interface ITournamentScheduleTimes {
  registrationOpensAtMs: number;
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
  userStatus:
    | 'not-joined'
    | 'got-ticket'
    | 'joined'
    | 'won'
    | 'lost'
    | 'pending';
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

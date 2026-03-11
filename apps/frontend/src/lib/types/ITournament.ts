export interface ITournament {
  id: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  prizePool: ITournamentAsset[];

  ticketCost: ITournamentAsset | null;

  sponsors: ITournamentSponsor[];

  imageURL: string;
  description?: string;

  maxParticipants: number;
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
  currency: 'gold' | 'usdc';
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
  prize: ITournamentAsset[];
}

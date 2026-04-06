import { create } from 'zustand';
import {
  fetchAllTournaments,
  type TournamentResponse,
} from '@/lib/services/tournament-api';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';

function mapStatus(
  backendStatus: string
): ITournament['status'] {
  const normalized = backendStatus.toLowerCase();
  if (normalized === 'registration' || normalized === 'upcoming')
    return 'upcoming';
  if (normalized === 'active' || normalized === 'battle') return 'active';
  if (normalized === 'ended' || normalized === 'finished') return 'ended';
  return 'upcoming';
}

function mapUserStatus(
  _response: TournamentResponse,
  _playerPubKey?: string
): ITournament['userStatus'] {
  if (!_playerPubKey) return 'not-joined';

  const isRegistered = _response.registeredPlayers.includes(_playerPubKey);
  const isPending = _response.pendingPlayers.includes(_playerPubKey);

  if (isPending) return 'pending';
  if (isRegistered) return 'got-ticket';
  return 'not-joined';
}

function buildPrizePool(response: TournamentResponse): ITournamentAsset[] {
  const total = Number(response.prizePool);
  if (!total || isNaN(total)) return [];
  return [{ type: 'currency', currency: 'gold', amount: total }];
}

function buildTicketCost(
  response: TournamentResponse
): ITournamentAsset | null {
  const price = Number(response.ticketPrice);
  if (!price || isNaN(price)) return null;
  return { type: 'currency', currency: 'gold', amount: price };
}

export function mapTournamentResponse(
  response: TournamentResponse,
  playerPubKey?: string
): ITournament {
  return {
    id: response.tournamentId,
    title: `Tournament #${response.tournamentId}`,
    dateFrom: '',
    dateTo: '',
    startDate: String(response.registrationStartSlot),
    status: mapStatus(response.status),
    userStatus: mapUserStatus(response, playerPubKey),
    maxParticipants: 0,
    imageURL: '/tournaments/grand-wizard.png',
    ticketCost: buildTicketCost(response),
    prizePool: buildPrizePool(response),
    sponsors: [],
  };
}

interface TournamentStore {
  tournaments: ITournament[];
  raw: TournamentResponse[];
  isLoading: boolean;
  error: string | null;

  loadTournaments: (playerPubKey?: string) => Promise<void>;
  clear: () => void;
}

export const useTournamentStore = create<TournamentStore>()((set) => ({
  tournaments: [],
  raw: [],
  isLoading: false,
  error: null,

  loadTournaments: async (playerPubKey?: string) => {
    set({ isLoading: true, error: null });

    try {
      const raw = await fetchAllTournaments();
      const tournaments = raw.map((r) =>
        mapTournamentResponse(r, playerPubKey)
      );
      set({ raw, tournaments, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load tournaments',
        isLoading: false,
      });
    }
  },

  clear: () =>
    set({ tournaments: [], raw: [], error: null }),
}));

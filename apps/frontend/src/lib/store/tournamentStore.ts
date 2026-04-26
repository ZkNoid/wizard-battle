import { create } from 'zustand';
import { slotToCalendarDate, slotToInstantMs } from '@/lib/mina/slotCalendar';
import {
  fetchAllTournaments,
  fetchTournamentChainStatus,
  type TournamentResponse,
} from '@/lib/services/tournament-api';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';

function mapStatus(backendStatus: string): ITournament['status'] {
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
  return [{ type: 'currency', currency: 'mina', amount: total }];
}

function buildTicketCost(
  response: TournamentResponse
): ITournamentAsset | null {
  const price = Number(response.ticketPrice);
  if (!price || isNaN(price)) return null;
  return { type: 'currency', currency: 'mina', amount: price };
}

export function mapTournamentResponse(
  response: TournamentResponse,
  playerPubKey?: string,
  anchor?: { slot: number; timeMs: number } | null
): ITournament {
  const hasAnchor =
    anchor != null &&
    Number.isFinite(anchor.slot) &&
    Number.isFinite(anchor.timeMs);

  const dateFrom = hasAnchor
    ? slotToCalendarDate(response.battleStartSlot, anchor)
    : '';
  const dateTo = hasAnchor
    ? slotToCalendarDate(response.battleEndSlot, anchor)
    : '';

  const scheduleTimes = hasAnchor
    ? {
        registrationOpensAtMs: slotToInstantMs(
          response.registrationStartSlot,
          anchor
        ),
        battleStartsAtMs: slotToInstantMs(response.battleStartSlot, anchor),
        battleEndsAtMs: slotToInstantMs(response.battleEndSlot, anchor),
      }
    : undefined;

  const displayTitle = response.title?.trim();
  const displayImageUrl = response.imageUrl?.trim();

  return {
    id: response.tournamentId,
    title:
      displayTitle && displayTitle.length > 0
        ? displayTitle
        : `Tournament #${response.tournamentId}`,
    dateFrom,
    dateTo,
    scheduleTimes,
    startDate: String(response.registrationStartSlot),
    status: mapStatus(response.status),
    userStatus: mapUserStatus(response, playerPubKey),
    participantCount: response.participantCount,
    imageURL:
      displayImageUrl && displayImageUrl.length > 0
        ? displayImageUrl
        : '/tournaments/grand-wizard.png',
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
      const [raw, chainStatus] = await Promise.all([
        fetchAllTournaments(),
        fetchTournamentChainStatus().catch(() => null),
      ]);

      const anchorTimeMs = Date.now();
      const anchor =
        chainStatus?.connected &&
        chainStatus.currentSlot != null &&
        Number.isFinite(chainStatus.currentSlot)
          ? { slot: chainStatus.currentSlot, timeMs: anchorTimeMs }
          : null;

      const tournaments = raw.map((r) =>
        mapTournamentResponse(r, playerPubKey, anchor)
      );
      set({ raw, tournaments, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load tournaments',
        isLoading: false,
      });
    }
  },

  clear: () => set({ tournaments: [], raw: [], error: null }),
}));

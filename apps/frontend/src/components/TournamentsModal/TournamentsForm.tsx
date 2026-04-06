'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMinaAppkit } from 'mina-appkit';
import ModalTitle from '../shared/ModalTitle';
import {
  TournamentsFilterPanel,
  type TournamentsFilters,
} from './TournamentsFilterPanel';
import { TournamentsList } from './TournamentsList';
import { TournamentDetailsForm } from './TournamentDetailsForm';
import { BuyTicketConfirmationModal } from './BuyTicketConfirmationModal';
import { CongratulationsModal } from './CongratulationsModal';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import type { ITournament, ITournamentAsset } from '@/lib/types/ITournament';
import {
  useBuyTicket,
  BUY_TICKET_STATUS_LABEL,
} from '@/lib/hooks/useBuyTicket';

interface TournamentsFormProps {
  onClose?: () => void;
}

const DEFAULT_FILTERS: TournamentsFilters = {
  sortBy: 'new_to_old',
};

function getPrizeScore(prizePool: ITournamentAsset[]): number {
  return prizePool.reduce((sum, asset) => {
    if (asset.type === 'currency') return sum + asset.amount;
    return sum;
  }, 0);
}

function sortTournaments(
  tournaments: ITournament[],
  sortBy: string
): ITournament[] {
  const sorted = [...tournaments];
  switch (sortBy) {
    case 'old_to_new':
      return sorted.sort(
        (a, b) => Number(a.startDate) - Number(b.startDate)
      );
    case 'prize_high':
      return sorted.sort(
        (a, b) => getPrizeScore(b.prizePool) - getPrizeScore(a.prizePool)
      );
    case 'prize_low':
      return sorted.sort(
        (a, b) => getPrizeScore(a.prizePool) - getPrizeScore(b.prizePool)
      );
    case 'new_to_old':
    default:
      return sorted.sort(
        (a, b) => Number(b.startDate) - Number(a.startDate)
      );
  }
}

export function TournamentsForm({ onClose }: TournamentsFormProps) {
  const { address } = useMinaAppkit();
  const [filters, setFilters] = useState<TournamentsFilters>(DEFAULT_FILTERS);
  const [selectedTournament, setSelectedTournament] =
    useState<ITournament | null>(null);
  const [joinTournament, setJoinTournament] = useState<ITournament | null>(
    null
  );
  const [claimTournament, setClaimTournament] = useState<ITournament | null>(
    null
  );

  const { status, txHash, error, isLoading, buyTicket, reset } = useBuyTicket();

  const {
    tournaments: allTournaments,
    isLoading: isTournamentsLoading,
    error: tournamentsError,
    loadTournaments,
  } = useTournamentStore();

  const refreshTournaments = useCallback(() => {
    void loadTournaments(address ?? undefined);
  }, [loadTournaments, address]);

  useEffect(() => {
    refreshTournaments();
  }, [refreshTournaments]);

  useEffect(() => {
    if (status === 'confirmed') refreshTournaments();
  }, [status, refreshTournaments]);

  const tournaments = sortTournaments(allTournaments, filters.sortBy);

  const handleJoinRequest = useCallback(
    (tournament: ITournament) => {
      if (!address) {
        reset();
        return;
      }
      if (isLoading) return;
      setJoinTournament(tournament);
    },
    [address, isLoading, reset]
  );

  const handleConfirmJoin = async (tournament: ITournament) => {
    setJoinTournament(null);
    await buyTicket(tournament);
  };

  const handleConfirmClaim = () => {
    // TODO: trigger claim rewards transaction
    setClaimTournament(null);
  };

  const handleDismissTxStatus = () => {
    reset();
  };

  const showTxStatus = status !== 'idle';

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle
        title={selectedTournament ? 'Tournament Details' : 'Tournaments'}
        onClose={onClose ?? (() => {})}
        onBack={
          selectedTournament ? () => setSelectedTournament(null) : undefined
        }
      />

      {selectedTournament ? (
        <TournamentDetailsForm
          tournament={selectedTournament}
          onJoin={handleJoinRequest}
          onClaim={setClaimTournament}
        />
      ) : (
        <>
          <TournamentsFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
          />

          {isTournamentsLoading ? (
            <div className="font-pixel text-main-gray/60 flex h-40 items-center justify-center text-base">
              Loading tournaments…
            </div>
          ) : tournamentsError ? (
            <div className="font-pixel flex h-40 flex-col items-center justify-center gap-2 text-base text-red-400">
              <span>Failed to load tournaments</span>
              <button
                onClick={refreshTournaments}
                className="text-sm underline opacity-70 hover:opacity-100"
              >
                Retry
              </button>
            </div>
          ) : (
            <TournamentsList
              tournaments={tournaments}
              onJoin={handleJoinRequest}
              onClaim={setClaimTournament}
              onViewDetails={setSelectedTournament}
            />
          )}
        </>
      )}

      {showTxStatus && (
        <TxStatusBar
          status={status}
          txHash={txHash}
          error={error}
          isLoading={isLoading}
          onDismiss={handleDismissTxStatus}
        />
      )}

      {joinTournament && (
        <BuyTicketConfirmationModal
          tournament={joinTournament}
          onConfirm={(t) => void handleConfirmJoin(t)}
          onBack={() => setJoinTournament(null)}
        />
      )}

      {claimTournament && (
        <CongratulationsModal
          rewards={claimTournament.prizePool}
          onClaim={handleConfirmClaim}
          onClose={() => setClaimTournament(null)}
        />
      )}
    </div>
  );
}

// ─── Inline transaction status bar ──────────────────────────────────────────

interface TxStatusBarProps {
  status: ReturnType<typeof useBuyTicket>['status'];
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
  onDismiss: () => void;
}

function TxStatusBar({
  status,
  txHash,
  error,
  isLoading,
  onDismiss,
}: TxStatusBarProps) {
  const isConfirmed = status === 'confirmed';
  const isFailed = status === 'failed';
  const isDismissible = isConfirmed || isFailed;

  return (
    <div
      className={[
        'fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3',
        'rounded-md border px-4 py-3 shadow-lg backdrop-blur-sm',
        'font-pixel-klein text-sm',
        isConfirmed
          ? 'border-green-500/40 bg-green-900/80 text-green-300'
          : isFailed
            ? 'border-red-500/40 bg-red-900/80 text-red-300'
            : 'border-yellow-500/40 bg-yellow-900/80 text-yellow-200',
      ].join(' ')}
    >
      {isLoading && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}

      <span>
        {BUY_TICKET_STATUS_LABEL[status]}
        {isFailed && error ? `: ${error}` : ''}
        {isConfirmed && txHash ? ` · tx ${txHash.slice(0, 8)}…` : ''}
      </span>

      {isDismissible && (
        <button
          onClick={onDismiss}
          className="ml-2 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

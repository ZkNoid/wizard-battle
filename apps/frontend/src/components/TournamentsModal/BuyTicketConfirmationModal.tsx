'use client';

import Image from 'next/image';
import { Button } from '../shared/Button';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { formatDateRange } from './tournamentUtils';
import type { ITournament } from '@/lib/types/ITournament';
import { BuyTicketConfirmBg } from './assets/buy-ticket-confirm-bg';

interface BuyTicketConfirmationModalProps {
  tournament: ITournament;
  onConfirm: (tournament: ITournament) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BuyTicketConfirmationModal({
  tournament,
  onConfirm,
  onBack,
  isLoading = false,
}: BuyTicketConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onBack}
    >
      <div className="relative h-80 w-80" onClick={(e) => e.stopPropagation()}>
        <BuyTicketConfirmBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-5">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Buy ticket
          </h2>

          {/* Tournament image */}
          <div className="flex flex-1 items-center justify-center py-2">
            <Image
              src={tournament.imageURL}
              width={96}
              height={96}
              alt={tournament.title}
              className="h-20 w-20 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Tournament name */}
          <span className="font-pixel text-main-gray w-full text-sm font-bold">
            {tournament.title}
          </span>

          {/* Dates */}
          <div className="mt-1 flex w-full items-center justify-between">
            <span className="font-pixel-klein text-main-gray/60 text-xs">
              Dates:
            </span>
            <span className="font-pixel-klein text-main-gray text-xs">
              {formatDateRange(tournament.dateFrom, tournament.dateTo)}
            </span>
          </div>

          {/* Ticket cost */}
          <div className="mt-1 flex w-full items-center justify-between">
            <span className="font-pixel-klein text-main-gray/60 text-xs">
              Ticket cost:
            </span>
            {tournament.ticketCost ? (
              <TournamentAssetDisplay asset={tournament.ticketCost} />
            ) : (
              <span className="font-pixel-klein text-sm font-bold text-green-400">
                Free
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex w-full gap-2">
            <Button
              variant="gray"
              onClick={onBack}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
              disabled={isLoading}
            >
              <span className="font-pixel text-main-gray text-base font-bold">
                Back
              </span>
            </Button>
            <Button
              variant="blue"
              onClick={() => onConfirm(tournament)}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
              disabled={isLoading}
            >
              <span className="font-pixel text-base font-bold text-white">
                {isLoading ? 'Processing...' : 'Confirm'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

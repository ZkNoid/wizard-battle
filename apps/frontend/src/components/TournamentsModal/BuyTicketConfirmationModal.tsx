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
}

export function BuyTicketConfirmationModal({
  tournament,
  onConfirm,
  onBack,
}: BuyTicketConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onBack}
    >
      <div className="h-90 relative w-80" onClick={(e) => e.stopPropagation()}>
        <BuyTicketConfirmBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-5">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Buy ticket
          </h2>

          {/* Ticket image */}
          <div className="flex items-center justify-center">
            <Image
              src="/tournaments/ticket.png"
              width={96}
              height={96}
              alt="medal"
              className="h-30 w-30 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Tournament name */}
          {/* <span className="font-pixel text-main-gray w-full text-sm font-bold">
            {tournament.title}
          </span> */}

          {/* Description */}
          <div className="font-pixel-klein text-main-gray/60 text-center text-sm">
            To participate in the tournament, you need to buy an entrance
            ticket. Its cost is shown below
          </div>

          {/* Ticket cost */}
          <div className="mt-1 flex w-full items-center justify-between">
            <span className="font-pixel text-main-gray text-md">Price:</span>
            {tournament.ticketCost ? (
              <TournamentAssetDisplay
                asset={tournament.ticketCost}
                className="text-main-gray"
              />
            ) : (
              <span className="font-pixel-klein text-main-gray text-sm font-bold">
                Free
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-auto flex w-full gap-2 pt-4">
            <Button
              variant="red"
              onClick={onBack}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-main-white text-base font-bold">
                Cancel
              </span>
            </Button>
            <Button
              variant="green"
              onClick={() => onConfirm(tournament)}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
            >
              <span className="font-pixel text-base font-bold">Buy</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

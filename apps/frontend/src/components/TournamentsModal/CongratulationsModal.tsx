'use client';

import Image from 'next/image';
import { Button } from '../shared/Button';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { BuyTicketConfirmBg } from './assets/buy-ticket-confirm-bg';
import type { ITournamentAsset } from '@/lib/types/ITournament';

interface CongratulationsModalProps {
  rewards: ITournamentAsset[];
  onClaim: () => void;
  onClose: () => void;
}

export function CongratulationsModal({
  rewards,
  onClaim,
  onClose,
}: CongratulationsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="h-105 w-95 relative" onClick={(e) => e.stopPropagation()}>
        <BuyTicketConfirmBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center px-6 py-5">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            Congratulations!
          </h2>
          <h2 className="font-pixel text-main-gray text-center text-lg font-bold">
            You are the Champion!
          </h2>

          {/* Medal image */}
          <div className="flex flex-1 items-center justify-center">
            <Image
              src="/tournaments/medal.png"
              width={96}
              height={96}
              alt="medal"
              className="h-40 w-40 object-contain object-center"
              unoptimized
            />
          </div>

          {/* Rewards list */}
          <div className="flex w-full flex-row justify-between gap-1">
            <span className="font-pixel text-main-gray text-lg">Rewards:</span>
            <div className="flex flex-col gap-1">
              {rewards.map((asset, i) => (
                <TournamentAssetDisplay
                  key={i}
                  asset={asset}
                  className="text-main-gray"
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex w-full pt-4">
            <Button
              variant="green"
              onClick={onClaim}
              className="h-12 flex-1"
              enableHoverSound
              enableClickSound
              size="xl"
            >
              <span className="font-pixel text-main-gray text-base font-bold">
                Claim rewards
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import ModalTitle from '../shared/ModalTitle';
import { Scroll } from '@/components/shared/Scroll';
import { Button } from '@/components/shared/Button';
import {
  TESTNET_LEADERBOARD,
  TESTNET_CURRENT_USER,
} from '@/lib/constants/testnet';

interface LeaderboardProps {
  onCancel?: () => void;
}

// Helper function to shorten wallet address
const shortenAddress = (address: string): string => {
  if (address.length < 10) return address;
  return `${address.slice(0, 3)}...${address.slice(-4)}`;
};

// Helper function to get medal icon or place number
const getPlaceDisplay = (place: number): string => {
  switch (place) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return place.toString();
  }
};

export function Leaderboard({ onCancel }: LeaderboardProps) {
  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Leaderboard" onClose={onCancel || (() => {})} />

      {/* Header Row */}
      <div className="mt-4 grid grid-cols-[1fr_2fr_1fr] gap-4 pl-2 pr-8">
        <span className="font-pixel text-left text-base text-black">Place</span>
        <span className="font-pixel text-center text-base text-black">
          Wallet number
        </span>
        <span className="font-pixel text-right text-base text-black">
          Points
        </span>
      </div>

      {/* Leaderboard List */}
      <div className="mt-1 flex-1 overflow-hidden pl-2">
        <Scroll height="100%" alwaysShowScrollbar>
          <div className="flex flex-col gap-2 pr-2">
            {[TESTNET_CURRENT_USER, ...TESTNET_LEADERBOARD].map((item) => (
              <Button
                key={item.place}
                variant="lightGray"
                className="h-16 w-full"
                isLong
              >
                <div className="grid w-full grid-cols-[1fr_2fr_1fr] gap-4 px-6">
                  {/* Place */}
                  <span className="flex items-center whitespace-nowrap text-left text-lg">
                    {getPlaceDisplay(item.place)}
                    {item.place === TESTNET_CURRENT_USER.place && (
                      <span className="font-pixel-klein ml-2 text-xs">
                        (Your place)
                      </span>
                    )}
                  </span>

                  {/* Wallet Address */}
                  <span className="flex items-center justify-center text-base">
                    {shortenAddress(item.walletAddress)}
                  </span>

                  {/* Points */}
                  <span className="flex items-center justify-end text-lg">
                    {item.points}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </Scroll>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { Scroll } from '../shared/Scroll';
import { Button } from '../shared/Button';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { TournamentsDetailsLeaderboardBg } from './assets/tournaments-details-leaderboard-bg';
import { ALL_TOURNAMENTS_LEADERBOARD } from '@/lib/constants/tournaments';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsLeaderboardProps {
  tournament: ITournament;
  currentUserAddress?: string;
}

const shortenAddress = (address: string): string => {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const PLACE_COINS: Record<number, string> = {
  1: '/icons/gold-coin.png',
  2: '/icons/silver-coin.png',
  3: '/icons/bronze-coin.png',
};

const getPlaceDisplay = (place: number): React.ReactNode => {
  const coin = PLACE_COINS[place];
  if (coin) {
    return (
      <Image
        src={coin}
        width={24}
        height={24}
        alt={`place-${place}`}
        unoptimized
        className="h-6 w-6 object-contain"
      />
    );
  }
  return <span>{place}</span>;
};

export function TournamentDetailsLeaderboard({
  tournament,
  currentUserAddress,
}: TournamentDetailsLeaderboardProps) {
  // const entries = ALL_TOURNAMENTS_LEADERBOARD[tournament.id] ?? [];
  const entries = ALL_TOURNAMENTS_LEADERBOARD['1'];
  return (
    <div className="relative flex h-full w-full flex-col">
      <TournamentsDetailsLeaderboardBg className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex h-full flex-col gap-3 p-5">
        {/* Title */}
        <span className="font-pixel text-main-gray text-base font-bold">
          Leaderboard
        </span>

        {/* Header row */}
        <div className="font-pixel text-main-gray border-main-gray/20 grid grid-cols-4 gap-2 border-b pb-2 pl-2 pr-8 text-sm">
          <span>Place</span>
          <span>Wallet</span>
          <span className="text-center">Wins</span>
          <span className="text-right">Prize</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-hidden">
          {entries?.length === 0 ? (
            <div className="font-pixel text-main-gray/40 flex h-full items-center justify-center text-sm">
              No participants yet
            </div>
          ) : (
            <Scroll height="100%" alwaysShowScrollbar>
              <div className="flex flex-col gap-2 pr-2">
                {entries?.map((item) => {
                  const isCurrentUser =
                    currentUserAddress === item.walletAddress;
                  return (
                    <Button
                      key={`${item.place}-${item.walletAddress}`}
                      variant={isCurrentUser ? 'blue' : 'lightGray'}
                      className="h-16 w-full"
                      isLong
                    >
                      <div className="grid w-full grid-cols-4 gap-2 px-6">
                        {/* Place */}
                        <span className="flex items-center gap-1 text-lg">
                          {getPlaceDisplay(item.place)}
                          {isCurrentUser && (
                            <span className="font-pixel-klein text-xs">
                              (You)
                            </span>
                          )}
                        </span>

                        {/* Wallet */}
                        <span className="font-pixel flex items-center text-sm">
                          {shortenAddress(item.walletAddress)}
                        </span>

                        {/* Wins */}
                        <span className="font-pixel-klein flex items-center justify-center text-sm font-bold">
                          {item.wins}
                        </span>

                        {/* Prize */}
                        <div className="flex flex-col items-end justify-center gap-0.5">
                          {item.prize?.length > 0 &&
                            item.prize?.map((asset, i) => (
                              <TournamentAssetDisplay
                                key={i}
                                asset={asset}
                                className="text-main-gray"
                              />
                            ))}
                          {item.prize?.length === 0 && (
                            <span className="font-pixel-klein text-main-gray/60 text-sm">
                              Sorry, you lost
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </Scroll>
          )}
        </div>
      </div>
    </div>
  );
}

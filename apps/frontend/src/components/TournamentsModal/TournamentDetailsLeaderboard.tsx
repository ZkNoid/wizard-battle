'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Scroll } from '../shared/Scroll';
import { Button } from '../shared/Button';
import { TournamentAssetDisplay } from './TournamentAssetDisplay';
import { TournamentsDetailsLeaderboardBg } from './assets/tournaments-details-leaderboard-bg';
import { fetchTournamentLeaderboard } from '@/lib/services/tournament-api';
import type {
  ITournament,
  ITournamentAsset,
  ITournamentLeaderboardItem,
} from '@/lib/types/ITournament';

function mapPrizeToAssets(
  prize: { type: 'currency'; currency: string; amount: number }[]
): ITournamentAsset[] {
  return prize.map((p) => {
    const c = p.currency.toLowerCase();
    if (c === 'mina') {
      return { type: 'currency', currency: 'mina', amount: p.amount };
    }
    if (c === 'usdc') {
      return { type: 'currency', currency: 'usdc', amount: p.amount };
    }
    return { type: 'currency', currency: 'gold', amount: p.amount };
  });
}

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
  const [entries, setEntries] = useState<ITournamentLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const raw = await fetchTournamentLeaderboard(tournament.id);
        if (cancelled) return;
        setEntries(
          raw.map((e) => ({
            place: e.place,
            walletAddress: e.walletAddress,
            wins: e.wins,
            losses: e.losses,
            score: e.score,
            prize: mapPrizeToAssets(e.prize),
          }))
        );
      } catch (err) {
        if (cancelled) return;
        setEntries([]);
        setError(
          err instanceof Error ? err.message : 'Failed to load leaderboard'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tournament.id]);

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <TournamentsDetailsLeaderboardBg className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex h-full flex-col gap-3 p-5">
        {/* Title */}
        <span className="font-pixel text-main-gray mb-2 text-center text-base font-bold">
          Leaderboard
        </span>

        {/* Header row */}
        <div className="font-pixel text-main-gray border-main-gray/20 grid grid-cols-4 gap-2 border-b pb-2 pl-2 pr-8 text-sm">
          <span>Place</span>
          <span>Wallet</span>
          <span className="text-center">Score</span>
          <span className="text-right">Prize</span>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="font-pixel text-main-gray/40 flex h-full items-center justify-center text-sm">
              Loading…
            </div>
          ) : error ? (
            <div className="font-pixel text-main-gray/60 flex h-full items-center justify-center px-4 text-center text-sm">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="font-pixel text-main-gray/40 flex h-full items-center justify-center text-sm">
              No participants yet
            </div>
          ) : (
            <Scroll height="100%" alwaysShowScrollbar>
              <div className="flex flex-col gap-2 pr-2">
                {entries.map((item) => {
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

                        {/* Score (100 + W − L, min 0) */}
                        <span className="font-pixel-klein flex flex-col items-center justify-center text-sm font-bold leading-tight">
                          <span>{item.score}</span>
                          <span className="text-main-gray/50 text-[10px] font-normal">
                            {item.wins}W-{item.losses}L
                          </span>
                        </span>

                        {/* Prize */}
                        <div className="flex flex-col items-end justify-center gap-0.5">
                          {tournament.status !== 'ended' ? (
                            <span className="font-pixel-klein text-main-gray/60 text-xs">
                              Event online
                            </span>
                          ) : item.prize?.length > 0 ? (
                            item.prize.map((asset, i) => (
                              <TournamentAssetDisplay
                                key={i}
                                asset={asset}
                                className="text-main-gray"
                              />
                            ))
                          ) : (
                            <span className="font-pixel-klein text-main-gray/60 text-xs">
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

'use client';

import { useEffect } from 'react';
import ModalTitle from '../shared/ModalTitle';
import { Scroll } from '@/components/shared/Scroll';
import { Button } from '@/components/shared/Button';
import { useQuestStore } from '@/lib/store/questStore';
import { useMinaAppkit } from 'mina-appkit';

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
  const { address } = useMinaAppkit();
  const {
    isLeaderboardLoading,
    loadLeaderboard,
    loadUserQuests,
    leaderboard,
    userRank,
  } = useQuestStore();

  // Load leaderboard and user rank when component mounts
  useEffect(() => {
    void loadLeaderboard();
    if (address) {
      void loadUserQuests(address);
    }
  }, [address, loadLeaderboard, loadUserQuests]);

  // Combine user rank with leaderboard, but don't duplicate if user is already in the list
  const displayList = (() => {
    if (!userRank) return leaderboard;

    const userInLeaderboard = leaderboard.find(
      (entry) => entry.walletAddress === userRank.walletAddress
    );

    if (userInLeaderboard) {
      return leaderboard;
    }

    // User is not in leaderboard, add them at the top for visibility
    return [userRank, ...leaderboard];
  })();

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
        {isLeaderboardLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-pixel text-main-gray text-lg">
              Loading leaderboard...
            </span>
          </div>
        ) : displayList.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-pixel text-main-gray text-lg">
              No entries yet
            </span>
          </div>
        ) : (
          <Scroll height="100%" alwaysShowScrollbar>
            <div className="flex flex-col gap-2 pr-2">
              {displayList.map((item) => {
                const isCurrentUser = address === item.walletAddress;
                return (
                  <Button
                    key={`${item.place}-${item.walletAddress}`}
                    variant={isCurrentUser ? 'blue' : 'lightGray'}
                    className="h-16 w-full"
                    isLong
                  >
                    <div className="grid w-full grid-cols-[1fr_2fr_1fr] gap-4 px-6">
                      {/* Place */}
                      <span className="flex items-center whitespace-nowrap text-left text-lg">
                        {getPlaceDisplay(item.place)}
                        {isCurrentUser && (
                          <span className="font-pixel-klein ml-2 text-xs">
                            (You)
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
                );
              })}
            </div>
          </Scroll>
        )}
      </div>
    </div>
  );
}

'use client';

import { ALL_ITEMS } from '@/lib/constants/items';
import type { IInventoryItem } from '@/lib/types/Inventory';

// Function to get random items from ALL_ITEMS
const getRandomRewards = (count: number): IInventoryItem[] => {
  const shuffled = [...ALL_ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((item) => ({
    ...item,
    amount: Math.floor(Math.random() * 5) + 1, // Random amount between 1-5
  }));
};

// Mock rewards data - 5 random items
const MOCK_REWARDS = getRandomRewards(5);

export default function RewardsSection() {
  return (
    <div className="mt-8 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-2xl font-bold">
        Choose Character & Duration
      </span>
      <div className="flex flex-col items-center gap-4">
        <span className="font-pixel text-main-gray w-110 text-center text-sm font-thin">
          Rewards you will receive when the expedition will end
        </span>
        <div className="flex flex-row flex-wrap justify-center gap-4">
          {MOCK_REWARDS.map((reward) => (
            <div
              key={reward.id}
              className="relative flex flex-col items-center gap-2 bg-gray-400 p-4"
            >
              <div className="flex h-16 w-16 items-center justify-center">
                <img
                  src={`/items/${reward.image}`}
                  alt={reward.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-pixel text-main-gray absolute bottom-1 right-1 px-1 text-xs">
                {reward.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { ALL_ITEMS } from '@/lib/constants/items';
import { useExpeditionStore } from '@/lib/store/expeditionStore';
import { useMemo } from 'react';

interface RewardsSectionProps {
  selectedLocationId: string | null;
}

export default function RewardsSection({ selectedLocationId }: RewardsSectionProps) {
  const { locations } = useExpeditionStore();

  // Get the selected location's rewards
  const locationRewards = useMemo(() => {
    if (!selectedLocationId) return [];

    const location = locations.find((loc) => loc.id === selectedLocationId);
    if (!location) return [];

    const allRewardIds = [
      ...(location.commonRewards ?? []),
      ...(location.uncommonRewards ?? []),
    ];

    // Map reward IDs to item data
    return allRewardIds
      .map((rewardId) => ALL_ITEMS.find((item) => item.id === rewardId))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);
  }, [selectedLocationId, locations]);

  if (!selectedLocationId || locationRewards.length === 0) {
    return (
      <div className="mt-4 flex flex-col gap-2.5">
        <span className="font-pixel text-main-gray text-center text-xl font-bold">
          Potential Rewards
        </span>
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-main-gray w-110 text-center text-sm font-thin">
            Select a location to see potential rewards
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-xl font-bold">
        Potential Rewards
      </span>
      <div className="flex flex-col items-center gap-2">
        <span className="font-pixel text-main-gray w-110 text-center text-sm font-thin">
          Rewards you may receive when the expedition ends
        </span>
        <div className="flex flex-row flex-wrap justify-center gap-4">
          {locationRewards.map((reward) => (
            <div
              key={reward.id}
              className="relative flex flex-col items-center gap-2 bg-gray-400 p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center">
                <img
                  src={`/items/${reward.image}`}
                  alt={reward.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

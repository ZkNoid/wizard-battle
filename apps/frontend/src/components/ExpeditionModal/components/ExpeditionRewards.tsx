import { Button } from '@/components/shared/Button';
import type { IExpeditionReward } from '@/lib/types/Expedition';
import Image from 'next/image';

const MAX_FULL_SIZE_COUNT = 4;
const FULL_ITEM_SIZE = 36;
const MIN_ITEM_SIZE = 20;

export default function ExpeditionRewards({
  rewards,
}: {
  rewards: IExpeditionReward[];
}) {
  const itemSize =
    rewards.length > MAX_FULL_SIZE_COUNT
      ? Math.max(
          MIN_ITEM_SIZE,
          Math.floor((FULL_ITEM_SIZE * MAX_FULL_SIZE_COUNT) / rewards.length)
        )
      : FULL_ITEM_SIZE;

  return (
    <Button variant="lightGray" className="h-15 w-full" isLong>
      <span className="flex w-full items-center gap-2 px-4 py-1">
        <Image
          src="/icons/gold-coin.png"
          width={16}
          height={16}
          alt="gold-coin-icon"
          className="size-6 object-contain object-center"
        />
        <span>Rewards: </span>
        <span className="my-1 flex flex-row gap-2">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="relative flex flex-col items-center gap-1 bg-gray-400/50 p-1"
            >
              <div
                className="flex items-center justify-center"
                style={{ width: itemSize, height: itemSize }}
              >
                <img
                  src={`/items/${reward.image}`}
                  alt={reward.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </span>
      </span>
    </Button>
  );
}

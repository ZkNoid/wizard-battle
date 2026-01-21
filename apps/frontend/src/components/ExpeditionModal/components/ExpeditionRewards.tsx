import { Button } from '@/components/shared/Button';
import type { IExpeditionReward } from '@/lib/types/Expedition';
import Image from 'next/image';

export default function ExpeditionRewards({
  rewards,
}: {
  rewards: IExpeditionReward[];
}) {
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
              className="relative flex flex-col items-center gap-1 bg-gray-400/50 p-1.5"
            >
              <div className="flex h-6 w-6 items-center justify-center">
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

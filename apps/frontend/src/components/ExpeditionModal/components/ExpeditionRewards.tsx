import { Button } from '@/components/shared/Button';
import type { IExpeditionReward } from '@/lib/types/Expedition';
import Image from 'next/image';

export default function ExpeditionRewards({
  rewards,
}: {
  rewards: IExpeditionReward[];
}) {
  return (
    <Button variant="lightGray" className="h-20 w-full">
      <span className="flex w-full items-center gap-2 px-4 py-2">
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
              className="relative flex flex-col items-center gap-2 bg-gray-400/50 p-4"
            >
              <div className="mb-1 flex h-6 w-6 items-center justify-center">
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

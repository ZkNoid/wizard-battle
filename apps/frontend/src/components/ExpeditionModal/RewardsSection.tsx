'use client';

export default function RewardsSection() {
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-2xl font-bold">
        Choose Character & Duration
      </span>
      <div className="flex flex-row justify-center gap-10">
        <span className="font-pixel text-main-gray w-110 text-center text-sm font-thin">
          Rewards you will receive when the expedition will end
        </span>
      </div>
    </div>
  );
}

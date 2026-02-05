'use client';

import ModalTitle from '../shared/ModalTitle';

interface LeaderboardProps {
  onCancel?: () => void;
}

export function Leaderboard({ onCancel }: LeaderboardProps) {
  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Leaderboard" onClose={onCancel || (() => {})} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4">
        <p className="font-pixel text-main-gray text-center text-lg">
          Top players in the testnet
        </p>
        {/* TODO: Add actual leaderboard data here */}
        <div className="mt-4 w-full">
          <div className="flex flex-col gap-2">
            <div className="font-pixel text-main-gray flex items-center justify-between rounded bg-white bg-opacity-20 p-3 text-base">
              <span>1. Player123</span>
              <span className="font-bold">1000 pts</span>
            </div>
            <div className="font-pixel text-main-gray flex items-center justify-between rounded bg-white bg-opacity-20 p-3 text-base">
              <span>2. Wizard456</span>
              <span className="font-bold">850 pts</span>
            </div>
            <div className="font-pixel text-main-gray flex items-center justify-between rounded bg-white bg-opacity-20 p-3 text-base">
              <span>3. Battler789</span>
              <span className="font-bold">720 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

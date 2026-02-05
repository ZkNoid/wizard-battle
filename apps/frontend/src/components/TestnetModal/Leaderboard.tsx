'use client';

import { Button } from '../shared/Button';

interface LeaderboardProps {
  onCancel?: () => void;
}

export function Leaderboard({ onCancel }: LeaderboardProps) {
  return (
    <div className="flex h-full flex-col items-center justify-between">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
        <h2 className="font-pixel text-main-gray text-2xl font-bold">
          Leaderboard
        </h2>
        <p className="font-pixel text-main-gray text-center text-lg">
          Top players in the testnet
        </p>
        {/* TODO: Add actual leaderboard data here */}
        <div className="mt-4 w-full max-w-md">
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
      <div className="flex w-full justify-center gap-4 pt-4">
        {onCancel && (
          <Button
            variant="gray"
            className="h-16 w-40"
            onClick={onCancel}
            enableHoverSound
            enableClickSound
          >
            <span className="font-pixel text-main-gray text-lg font-bold">
              Close
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

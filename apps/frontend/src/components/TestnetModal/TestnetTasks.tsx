'use client';

import { Button } from '../shared/Button';

interface TestnetTasksProps {
  onCancel?: () => void;
}

export function TestnetTasks({ onCancel }: TestnetTasksProps) {
  return (
    <div className="flex h-full flex-col items-center justify-between">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
        <h2 className="font-pixel text-main-gray text-2xl font-bold">
          Testnet Tasks
        </h2>
        <p className="font-pixel text-main-gray text-center text-lg">
          Complete tasks to earn rewards and climb the leaderboard
        </p>
        {/* TODO: Add actual testnet tasks list here */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="font-pixel text-main-gray text-base">
            • Task 1: Connect wallet
          </div>
          <div className="font-pixel text-main-gray text-base">
            • Task 2: Complete first battle
          </div>
          <div className="font-pixel text-main-gray text-base">
            • Task 3: Craft an item
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

'use client';

import ModalTitle from '../shared/ModalTitle';

interface TestnetTasksProps {
  onCancel?: () => void;
}

export function TestnetTasks({ onCancel }: TestnetTasksProps) {
  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Testnet Tasks" onClose={onCancel || (() => {})} />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4">
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
    </div>
  );
}

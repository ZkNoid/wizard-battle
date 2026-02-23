'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/shared/Button';
import ModalTitle from '../shared/ModalTitle';
import { Scroll } from '@/components/shared/Scroll';
import { TestnetTaskBlock } from './TestnetTaskBlock';
import { useQuestStore } from '@/lib/store/questStore';
import { useMinaAppkit } from 'mina-appkit';

interface TestnetTasksProps {
  onCancel?: () => void;
}

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
};

export function TestnetTasks({ onCancel }: TestnetTasksProps) {
  // TODO: Replace with actual testnet end date
  const testnetEndDate = new Date('2026-03-31T23:59:59');
  const [remainingTime, setRemainingTime] = useState(0);

  const { address } = useMinaAppkit();
  const {
    isLoading,
    questStatus,
    loadUserQuests,
    getTestnetBlocks,
    getTotalQuests,
    getCompletedQuests,
  } = useQuestStore();

  // Load quests when component mounts or address changes
  useEffect(() => {
    if (address) {
      void loadUserQuests(address);
    }
  }, [address, loadUserQuests]);

  useEffect(() => {
    const calculateRemaining = () => {
      const endTime = testnetEndDate.getTime();
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setRemainingTime(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [testnetEndDate]);

  const blocks = getTestnetBlocks();
  const totalQuests = getTotalQuests();
  const completedQuests = getCompletedQuests();

  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Testnet Tasks" onClose={onCancel || (() => {})} />

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="lightGray" className="w-68 h-14" isLong>
          <span className="flex w-full items-center gap-1 px-2">
            <Image
              src="/icons/timer.png"
              width={16}
              height={16}
              alt="timer-icon"
              className="size-6 object-contain object-center"
            />
            <span className="text-sm">
              Time left: {formatTime(remainingTime)}
            </span>
          </span>
        </Button>

        <Button variant="lightGray" className="w-68 h-14" isLong>
          <span className="flex w-full items-center gap-1 px-2">
            <Image
              src="/icons/pin.png"
              width={16}
              height={16}
              alt="pin"
              className="size-6 object-contain object-center"
            />
            <span className="text-sm">
              Quests complete: {completedQuests}/{totalQuests}
            </span>
          </span>
        </Button>
      </div>

      <div className="my-2 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-pixel text-main-gray text-lg">
              Loading quests...
            </span>
          </div>
        ) : !address ? (
          <div className="flex h-full items-center justify-center">
            <span className="font-pixel text-main-gray text-lg">
              Connect wallet to view quests
            </span>
          </div>
        ) : (
          <Scroll height="100%" alwaysShowScrollbar>
            <div className="flex flex-col gap-4 pr-2">
              {blocks.map((block, index) => (
                <TestnetTaskBlock
                  key={index}
                  block={block}
                  onTaskToggle={() => {}}
                  userPoints={questStatus?.totalPoints}
                />
              ))}
            </div>
          </Scroll>
        )}
      </div>
    </div>
  );
}

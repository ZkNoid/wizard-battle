'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/shared/Button';
import ModalTitle from '../shared/ModalTitle';
import { Scroll } from '@/components/shared/Scroll';
import { TESTNET_BLOCKS } from '@/lib/constants/testnet';
import { TestnetTaskBlock } from './TestnetTaskBlock';

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

  // Calculate total and completed quests
  const totalQuests = TESTNET_BLOCKS.reduce(
    (sum, block) => sum + block.items.length,
    0
  );
  const completedQuests = TESTNET_BLOCKS.reduce(
    (sum, block) => sum + block.items.filter((item) => item.isCompleted).length,
    0
  );

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
        <Scroll height="100%" alwaysShowScrollbar>
          <div className="flex flex-col gap-4 pr-2">
            {TESTNET_BLOCKS.map((block, index) => (
              <TestnetTaskBlock
                key={index}
                block={block}
                onTaskToggle={(taskIndex) => {
                  // TODO: Implement task toggle logic
                  console.log(`Toggle task ${taskIndex} in block ${index}`);
                }}
              />
            ))}
          </div>
        </Scroll>
      </div>
    </div>
  );
}

'use client';

import { Checkbox } from '@/components/shared/Checkbox';
import type { ITestnetBlock } from '@/lib/types/ITestnet';
import { cn } from '@/lib/utils';
import { TestnetTaskBg } from './assets/testnet-task-bg';

interface TestnetTaskBlockProps {
  block: ITestnetBlock;
  onTaskToggle?: (taskIndex: number) => void;
  className?: string;
}

export function TestnetTaskBlock({
  block,
  onTaskToggle,
  className,
}: TestnetTaskBlockProps) {
  const completedCount = block.items.filter((item) => item.isCompleted).length;
  const totalCount = block.items.length;
  const isFullyCompleted = completedCount === totalCount;

  return (
    <div className={cn('relative', className)}>
      {/* Content */}
      <div className="relative z-[1]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <h3 className="font-pixel text-lg text-black">{block.title}</h3>
          <div className="flex flex-col items-end">
            <span className="font-pixel text-lg text-black">
              {block.points} points
            </span>
            <span className="font-pixel text-xs text-gray-600">
              (Each quest)
            </span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex flex-col gap-3 px-4 pb-4">
          {block.items.map((item, index) => (
            <Checkbox
              key={index}
              checked={item.isCompleted}
              onChange={() => onTaskToggle?.(index)}
              label={item.title}
              className="text-base"
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <TestnetTaskBg className="absolute inset-0 z-0 h-full w-full" />
    </div>
  );
}

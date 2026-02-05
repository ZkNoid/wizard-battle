'use client';

import { Checkbox } from '@/components/shared/Checkbox';
import type { ITestnetBlock } from '@/lib/types/ITestnet';
import { cn } from '@/lib/utils';

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
    <div
      className={cn(
        'overflow-hidden border-4 border-black bg-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b-4 border-black bg-gray-300 px-4 py-3">
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
      <div className="flex flex-col gap-3 p-4">
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

      {/* Optional Progress Indicator */}
      {isFullyCompleted && (
        <div className="border-t-4 border-black bg-green-200 px-4 py-2 text-center">
          <span className="font-pixel text-sm text-green-800">
            ✓ All tasks completed!
          </span>
        </div>
      )}
    </div>
  );
}

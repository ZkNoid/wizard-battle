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
            <div key={index} className="flex items-center gap-2">
              <Checkbox
                checked={item.isCompleted}
                onChange={() => onTaskToggle?.(index)}
                label={item.title}
                className="text-base"
              />
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-pixel text-sm text-blue-600 underline hover:text-blue-800"
                >
                  (Open form)
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background */}
      <TestnetTaskBg className="absolute inset-0 z-0 h-full w-full" />
    </div>
  );
}

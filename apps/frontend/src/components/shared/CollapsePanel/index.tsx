'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

export function CollapsePanel({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: React.ReactNode | string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-main-gray font-pixel flex w-full cursor-pointer items-center gap-2 py-3 text-base transition-all duration-300"
      >
        <span
          className={cn(
            'transition-transform duration-300',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        >
          ▼
        </span>
        <span className="text-lg font-bold">{title}</span>
      </button>

      {/* Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div>{children}</div>
      </div>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { BoxBg } from './assets/box-bg';
import { cn } from '@/lib/utils';
import { useHoverSound } from '@/lib/hooks/useAudio';

export default function BoxButton({
  onClick,
  children,
  className,
  color = 'blue',
  disabled,
  enableHoverSound = false,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  color?: 'blue' | 'gray';
  disabled?: boolean;
  enableHoverSound?: boolean;
}) {
  const playHoverSound = useHoverSound();

  const handleMouseEnter = () => {
    if (enableHoverSound && !disabled) {
      playHoverSound();
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      className={cn(
        'group/button not-disabled:hover:scale-105 relative z-[1] flex cursor-pointer items-center justify-center text-base transition-transform duration-300',
        className
      )}
    >
      {children}
      <BoxBg className="absolute inset-0 -z-[1] h-full w-full" color={color} />
    </button>
  );
}

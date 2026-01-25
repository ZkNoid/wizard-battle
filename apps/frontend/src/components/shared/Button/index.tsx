'use client';

import { cn } from '@/lib/utils';
import { ButtonBackground } from './assets/button-background';
import { LongButtonBackground } from './assets/long-button-background';
import { useHoverSound, useClickSound } from '@/lib/hooks/useAudio';

export function Button({
  text,
  children,
  variant,
  onClick,
  className,
  type = 'button',
  disabled,
  isLong,
  enableHoverSound = false,
  enableClickSound = false,
}: {
  variant: 'gray' | 'blue' | 'lightGray' | 'green' | 'red';
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLong?: boolean;
  enableHoverSound?: boolean;
  enableClickSound?: boolean;
}) {
  const playHoverSound = useHoverSound();
  const playClickSound = useClickSound();
  const textColor = variant === 'red' ? 'text-white' : 'text-main-gray';

  const handleMouseEnter = () => {
    if (enableHoverSound && !disabled) {
      playHoverSound();
    }
  };

  const handleClick = () => {
    if (enableClickSound && !disabled) {
      playClickSound();
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      className={cn(
        'not-disabled:group/button font-pixel not-disabled:hover:scale-105 relative z-[1] flex cursor-pointer items-center justify-center text-base transition-transform duration-300 disabled:cursor-not-allowed disabled:opacity-80',
        className,
        textColor
      )}
    >
      {children ? children : <span className={textColor}>{text}</span>}
      {isLong ? <LongButtonBackground color={variant} className="absolute inset-0 -z-[1] h-full w-full" /> : <ButtonBackground color={variant} className="absolute inset-0 -z-[1] h-full w-full" />}
    </button>
  );
}

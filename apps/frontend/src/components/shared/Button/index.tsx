'use client';

import { cn } from '@/lib/utils';
import { ButtonBackground } from './assets/button-background';

export function Button({
  text,
  children,
  variant,
  onClick,
  className,
  type = 'button',
  disabled,
}: {
  variant: 'gray' | 'blue' | 'lightGray';
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-main-gray not-disabled:group/button font-pixel not-disabled:hover:scale-105 relative z-[1] flex cursor-pointer items-center justify-center text-base transition-transform duration-300 disabled:cursor-not-allowed disabled:opacity-80',
        className
      )}
    >
      {children ? children : <span>{text}</span>}
      <ButtonBackground
        color={variant}
        className="absolute inset-0 -z-[1] h-full w-full"
      />
    </button>
  );
}

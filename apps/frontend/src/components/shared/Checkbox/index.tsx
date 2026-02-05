'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
  disabled = false,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div
        className={cn(
          'relative flex h-6 w-6 items-center justify-center transition-transform',
          !disabled && 'hover:scale-110'
        )}
        onClick={(e) => {
          if (!disabled) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <Image
          src={checked ? '/icons/checkbox-true.png' : '/icons/checkbox-false.png'}
          width={24}
          height={24}
          alt={checked ? 'checked' : 'unchecked'}
          className="size-6 object-contain"
        />
      </div>
      {label && (
        <span className="font-pixel text-main-gray select-none text-sm">
          {label}
        </span>
      )}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}

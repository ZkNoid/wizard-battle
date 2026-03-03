'use client';

import { cn } from '@/lib/utils';
import { InputBg } from './assets/input-bg';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: 'text' | 'number' | 'password';
}

export function Input({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  type = 'text',
}: InputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="font-pixel text-main-gray placeholder:text-main-gray/50 relative z-10 h-full w-full bg-transparent px-3 py-2 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <InputBg className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}

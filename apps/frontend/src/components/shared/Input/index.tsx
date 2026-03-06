'use client';

import { cn } from '@/lib/utils';
import { InputMdBg } from './assets/input-md-bg';
import { InputXlBg } from './assets/input-xl-bg';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: 'text' | 'number' | 'password';
  size?: 'md' | 'xl';
}

export function Input({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  type = 'text',
  size = 'md',
}: InputProps) {
  const InputBg = size === 'md' ? InputMdBg : InputXlBg;

  return (
    <div className={cn('relative h-16 w-full', className)}>
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

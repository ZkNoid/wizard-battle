'use client';

import { cn } from '@/lib/utils';
import { Input } from '.';

interface InputWithLabelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: 'text' | 'number' | 'password';
}

export function InputWithLabel({
  label,
  className,
  ...inputProps
}: InputWithLabelProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="font-pixel text-main-gray text-base font-bold">
        {label}
      </span>
      <Input {...inputProps} />
    </div>
  );
}

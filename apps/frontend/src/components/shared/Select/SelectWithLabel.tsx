'use client';

import { cn } from '@/lib/utils';
import { Select, type SelectOption } from '.';

interface SelectWithLabelProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SelectWithLabel({
  label,
  className,
  ...selectProps
}: SelectWithLabelProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="font-pixel text-main-gray text-base font-bold">
        {label}
      </span>
      <Select {...selectProps} />
    </div>
  );
}

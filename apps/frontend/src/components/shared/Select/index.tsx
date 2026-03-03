'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  triggerClassName,
  dropdownClassName,
  optionClassName,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full select-none', className)}
    >
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'font-pixel text-main-gray flex w-full cursor-pointer items-center justify-between px-3 py-2 text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <span>{selectedLabel}</span>
        <span
          className={cn(
            'ml-2 transition-transform duration-200',
            isOpen ? 'rotate-180' : 'rotate-0'
          )}
        >
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 w-full',
            dropdownClassName
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'font-pixel text-main-gray flex w-full cursor-pointer items-center px-3 py-2 text-base transition-opacity hover:opacity-70',
                value === option.value && 'opacity-50',
                optionClassName
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

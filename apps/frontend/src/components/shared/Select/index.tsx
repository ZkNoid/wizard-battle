'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SelectTriggerBg } from './assets/select-trigger-bg';
import { SelectDropdownBg } from './assets/select-dropdown-bg';
import { SelectArrow } from './assets/select-arrow';

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
  optionClassName?: string;
  disabled?: boolean;
}

// Trigger height matches SelectTriggerBg viewBox height (50px)
const TRIGGER_HEIGHT = 50;
// Each option row height
const OPTION_HEIGHT = 33;
// Fixed dropdown height matches SelectDropdownBg viewBox height (166px)
const DROPDOWN_HEIGHT = 166;
// Inner scrollable area: dropdown height minus top/bottom borders (~10px each)
const DROPDOWN_INNER_HEIGHT = DROPDOWN_HEIGHT - 20;

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
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
      className={cn('relative w-[277px] select-none', className)}
    >
      {/* Trigger — always visible */}
      <div className="relative" style={{ height: TRIGGER_HEIGHT }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="font-pixel text-main-gray relative z-10 flex h-full w-full cursor-pointer items-center justify-between px-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base">{selectedLabel}</span>
          <SelectArrow
            className={cn(
              'transition-transform duration-200',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
        <SelectTriggerBg className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      {/* Dropdown — shown below trigger when open */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 w-full"
          style={{ height: DROPDOWN_HEIGHT }}
        >
          <SelectDropdownBg className="pointer-events-none absolute inset-0 h-full w-full" />
          <div
            className="relative z-10 overflow-y-auto"
            style={{ height: DROPDOWN_INNER_HEIGHT, marginTop: 10 }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                style={{ height: OPTION_HEIGHT }}
                className={cn(
                  'font-pixel text-main-gray flex w-full cursor-pointer items-center px-3 text-base transition-opacity hover:opacity-70',
                  value === option.value && 'opacity-50',
                  optionClassName
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

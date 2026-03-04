'use client';

import { MinItemBg } from './assets/min-item-bg';
import { QuantityDisplayBg } from './assets/quantity-display-bg';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: QuantitySelectorProps) {
  const increment = () => onChange(Math.min(max, value + step));
  const decrement = () => onChange(Math.max(min, value - step));
  const setMin = () => onChange(min);
  const setMax = () => onChange(max);

  return (
    <div
      className={`flex w-full items-center justify-between gap-1.5 ${className ?? ''}`}
    >
      <button
        onClick={setMin}
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-105"
      >
        <MinItemBg className="absolute inset-0 h-full w-full" />
        <span className="font-pixel text-main-gray relative z-10 text-xs font-bold">
          {min}
        </span>
      </button>

      <div className="relative flex h-10 shrink-0" style={{ width: '141px' }}>
        <QuantityDisplayBg className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* + zone */}
        <button
          onClick={increment}
          disabled={value >= max}
          className="absolute left-0 top-0 h-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ width: '35px' }}
        />

        {/* value display */}
        <div
          className="absolute top-0 flex h-full items-center justify-center"
          style={{ left: '35px', width: '71px' }}
        >
          <span className="font-pixel text-main-gray text-sm font-bold">
            {value}
          </span>
        </div>

        {/* - zone */}
        <button
          onClick={decrement}
          disabled={value <= min}
          className="absolute right-0 top-0 h-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ width: '35px' }}
        />
      </div>

      <button
        onClick={setMax}
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-105"
      >
        <MinItemBg className="absolute inset-0 h-full w-full" />
        <span className="font-pixel text-main-gray relative z-10 text-xs font-bold">
          All
        </span>
      </button>
    </div>
  );
}

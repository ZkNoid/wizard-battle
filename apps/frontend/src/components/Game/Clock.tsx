'use client';

import { useState, useEffect, useRef } from 'react';
import { ClockIcon } from './assets/clock-icon';
import { TimeBg } from './assets/time-bg';
import { cn } from '@/lib/utils';
import { EventBus } from '../../game/EventBus';

export function Clock({ className }: { className?: string }) {
  const [remainingMs, setRemainingMs] = useState(0);
  const deadlineRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const start = (ms: number) => {
      deadlineRef.current = Date.now() + ms;
      setRemainingMs(ms);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const d = deadlineRef.current ?? 0;
        const left = Math.max(0, d - Date.now());
        setRemainingMs(left);
        if (left <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 1000);
    };

    const handler = (ms: number) => start(ms);
    EventBus.on('phase-timer-start', handler);
    // Ask for current timer if emitted before this component mounted
    EventBus.emit('request-phase-timer');
    return () => {
      EventBus.off('phase-timer-start', handler);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    const formattedSeconds = String(seconds % 60).padStart(2, '0');
    const formattedMinutes = String(minutes % 60).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex flex-col items-center justify-center gap-4">
        <ClockIcon className="w-21 h-22.5" />
        <div className="w-69 h-21 relative flex flex-col items-center justify-center">
          <span className="text-main-gray font-pixel text-3xl font-bold">
            {formatTime(remainingMs)}
          </span>
          <TimeBg className="w-69 h-21 absolute left-0 top-0 -z-[1]" />
        </div>
      </div>
    </div>
  );
}

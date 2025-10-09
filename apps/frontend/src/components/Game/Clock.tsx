'use client';

import { useState, useEffect, useRef } from 'react';
import { EventBus } from '../../game/EventBus';
import { NewTimeBg } from './assets/new-time-bg';

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
    <div className="w-61 relative flex h-28 flex-row items-center justify-center">
      <span className="font-pixel text-main-gray z-[1] ml-8 mt-0.5 text-3xl">
        {formatTime(remainingMs)}
      </span>
      <NewTimeBg className="absolute inset-0 size-full" />
    </div>
  );
}

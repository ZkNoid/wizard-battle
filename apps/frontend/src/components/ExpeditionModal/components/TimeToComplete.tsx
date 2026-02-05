'use client';

import { Button } from '@/components/shared/Button';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function TimeToComplete({
  timeToComplete,
  startedAt,
  onExpeditionPeriodEnded,
}: {
  timeToComplete: number;
  startedAt?: Date;
  onExpeditionPeriodEnded?: (ended: boolean) => void;
}) {
  const [remainingTime, setRemainingTime] = useState(timeToComplete);

  useEffect(() => {
    if (!startedAt) {
      setRemainingTime(timeToComplete);
      return;
    }

    const calculateRemaining = () => {
      const startTime = new Date(startedAt).getTime();
      const endTime = startTime + timeToComplete;
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setRemainingTime(remaining);
      onExpeditionPeriodEnded?.(remaining === 0);
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [startedAt, timeToComplete, onExpeditionPeriodEnded]);

  return (
    <Button variant="lightGray" className="w-65 h-18">
      <span className="flex w-full items-center gap-2 px-4">
        <Image
          src="/icons/timer.png"
          width={16}
          height={16}
          alt="timer-icon"
          className="size-8 object-contain object-center"
        />
        <span>{formatTime(remainingTime)}</span>
      </span>
    </Button>
  );
}

'use client';

import { Button } from '@/components/shared/Button';
import Image from 'next/image';

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function TimeToComplete({
  timeToComplete,
}: {
  timeToComplete: number;
}) {
  return (
    <Button variant="lightGray" className="w-60 h-20">
      <span className="flex w-full items-center gap-2 px-4">
        <Image
          src="/icons/timer.png"
          width={16}
          height={16}
          alt="timer-icon"
          className="size-8 object-contain object-center"
        />
        <span>{formatTime(timeToComplete)}</span>
      </span>
    </Button>
  );
}

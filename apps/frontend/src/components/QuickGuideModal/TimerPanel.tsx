'use client';

import { TimerBg } from './assets/timer-bg';

export default function TimerPanel() {
  return (
    <div className="relative w-full">
      <TimerBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-6 py-4">
        {/* Content will be added here */}
      </div>
    </div>
  );
}

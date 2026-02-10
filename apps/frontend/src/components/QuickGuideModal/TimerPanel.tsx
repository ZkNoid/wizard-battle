'use client';

import { TimerBg } from './assets/timer-bg';

export default function TimerPanel() {
  return (
    <div className="relative w-full">
      <div className="relative z-10 px-6 py-4">
        {/* Content will be added here */}
      </div>
      <TimerBg className="absolute inset-0 -z-10 size-full" />
    </div>
  );
}

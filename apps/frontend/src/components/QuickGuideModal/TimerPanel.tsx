'use client';

import { TimerBg } from './assets/timer-bg';
import { TimerImg } from './assets/timer-img';

export default function TimerPanel() {
  return (
    <div className="h-38 relative w-full">
      <TimerBg className="absolute inset-0 size-full" />
      <div className="relative z-10 px-5 py-4">
        {/* Title */}
        <h3 className="font-pixel text-main-gray mb-0 text-xl font-bold">
          Timer
        </h3>

        {/* Content - 2 columns */}
        <div className="flex items-center gap-2">
          {/* Left column - Timer display with hourglass */}
          <TimerImg className="w-40" />

          {/* Right column - Description text */}
          <div className="flex flex-1">
            <p className="font-pixel-klein text-main-gray text-sm leading-relaxed">
              You only have 2 minutes to make your move, if you don&apos;t make a
              move in that time, your opponent will automatically win.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

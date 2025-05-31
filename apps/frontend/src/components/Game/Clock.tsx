"use client";

import { useState, useEffect } from "react";
import { ClockIcon } from "./assets/clock-icon";
import { TimeBg } from "./assets/time-bg";
import { cn } from "@/lib/utils";

export function Clock({ className }: { className?: string }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTime = Date.now();

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    const formattedSeconds = String(seconds % 60).padStart(2, "0");
    const formattedMinutes = String(minutes % 60).padStart(2, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
  };

  return (
    <div className={cn("absolute left-0 top-0 flex flex-col", className)}>
      <div className="flex flex-col items-center justify-center gap-4">
        <ClockIcon className="w-21 h-22.5" />
        <div className="w-69 h-21 relative flex flex-col items-center justify-center">
          <span className="text-main-gray font-pixel text-3xl font-bold">
            {formatTime(elapsedTime)}
          </span>
          <TimeBg className="w-69 h-21 absolute left-0 top-0 -z-[1]" />
        </div>
      </div>
    </div>
  );
}

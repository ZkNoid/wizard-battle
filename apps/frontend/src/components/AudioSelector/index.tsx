"use client";

import { AudioIcon } from "./assets/audio-icon";
import { VolumeBar } from "./assets/volume-bar";
import { VolumeHandle } from "./assets/volume-handle";
import { useState } from "react";

export default function AudioSelector() {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(50);

  return (
    <div className="flex items-center gap-4">
      {/* Audio On/Off button */}
      <button
        onClick={() => setIsActive(!isActive)}
        className="cursor-pointer transition-transform duration-300 hover:scale-105"
      >
        <AudioIcon className="h-20 w-20" isActive={isActive} />
      </button>
      {/* Volume Slider */}
      <div className="relative h-5 w-64">
        <VolumeBar className="pointer-events-none h-full w-full" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        {/* Handle */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 transition-transform duration-100"
          style={{
            left: `${volume - 8}%`,
          }}
        >
          <VolumeHandle className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

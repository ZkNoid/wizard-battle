import { VolumeBar } from '../AudioSelector/assets/volume-bar';
import { VolumeHandle } from '../AudioSelector/assets/volume-handle';

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function VolumeSlider({ label, value, onChange }: VolumeSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-main-gray text-lg font-bold">
          {label}
        </span>
        <span className="font-pixel text-main-gray text-lg font-bold">
          {value}%
        </span>
      </div>
      <div className="relative h-7 w-full">
        <VolumeBar className="pointer-events-none h-full w-full" />
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 transition-transform duration-100"
          style={{ left: `${value - 8}%` }}
        >
          <VolumeHandle className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

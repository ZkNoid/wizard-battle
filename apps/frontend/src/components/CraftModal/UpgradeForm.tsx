import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';

export function UpgradeForm() {
  return (
    <div className="relative flex min-h-[600px] flex-col px-5">
      {/* Header */}
      <UpgradeFieldBg className="absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content will go here */}
      <div className="flex flex-col gap-2.5">
        {/* TODO: Add upgrade content */}
      </div>
    </div>
  );
}

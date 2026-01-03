import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';

export function UpgradeForm() {
  return (
    <div className="relative flex h-full flex-col px-5">
      {/* Background */}
      <UpgradeFieldBg className="-mt-23 absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col gap-5">
        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col gap-2.5">
            {/* Upgrade content goes here */}
            <div>check</div>
          </div>
        </div>
      </div>
    </div>
  );
}

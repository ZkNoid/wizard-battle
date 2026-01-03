import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';

export function UpgradeForm() {
  const upgradeChance = 48;
  return (
    <div className="relative flex h-full flex-col">
      {/* Content */}
      <div className="relative flex h-full w-full flex-col gap-5">
        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col gap-2.5">
            {/* Upgrade content goes here */}
            <div className="relative h-[470px] w-full bg-[#ACB0BC]">
              {/* Background overlay */}
              <UpgradeFieldBg className="absolute inset-0 z-10 h-full w-full" />

              {/* Inner content */}
              <div className="relative z-20 flex size-10 w-full items-center justify-center">
                Upgrade chance: {upgradeChance}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

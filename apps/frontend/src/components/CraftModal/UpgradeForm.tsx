import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';

export function UpgradeForm() {
  return (
    <div className="relative flex h-[600px] flex-col px-5">
      {/* Background */}
      <UpgradeFieldBg className="absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col gap-5">
        {/* Header */}
        <div className="flex flex-shrink-0 flex-row items-center gap-2.5">
          <Image
            src="/icons/armor.png"
            width={32}
            height={28}
            alt="upgrade"
            className="h-7 w-8 object-contain object-center"
          />
          <span className="font-pixel text-main-gray text-lg font-bold">
            Upgrade
          </span>
        </div>

        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          {/* TODO: Add upgrade content with Scroll component if needed */}
          <div className="flex flex-col gap-2.5">
            {/* Upgrade content goes here */}
          </div>
        </div>
      </div>
    </div>
  );
}

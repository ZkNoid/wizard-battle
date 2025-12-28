import Image from 'next/image';

export function UpgradeForm() {
  return (
    <div className="flex flex-col gap-5 px-5">
      {/* Header */}
      <div className="flex flex-row items-center justify-center gap-2.5">
        <Image
          src="/icons/armor.png"
          width={32}
          height={28}
          alt="upgrade"
          className="h-7 w-8 object-contain object-center"
        />
        <span className="font-pixel text-main-gray text-lg font-bold">
          Upgrade Items
        </span>
      </div>

      {/* Content will go here */}
      <div className="flex flex-col gap-2.5">
        {/* TODO: Add upgrade content */}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';

export default function CurrentExpeditionsForm({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="font-pixel text-main-gray flex w-full items-center justify-between pb-5 pt-2.5 text-4xl font-bold">
        <span className="flex-1 text-center">Current Expeditions</span>
        <Image
          src="/icons/cross.png"
          width={32}
          height={32}
          alt="close"
          className="mr-4 size-8 cursor-pointer transition-transform duration-300 hover:rotate-90"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

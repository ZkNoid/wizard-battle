'use client';

import Image from 'next/image';
import { useState } from 'react';
import ChooseLocation from './ChooseLocation';
import ChooseCharacter from './ChooseCharacter';

export default function NewExpeditionForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);

  const handleSelectLocation = (location: number | null) => {
    setSelectedLocation(location);
    console.log(location);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="font-pixel text-main-gray mt-5 flex w-full items-center justify-between pb-5 pt-2.5 text-4xl font-bold">
        <span className="flex-1 text-center">Expedition</span>
        <Image
          src="/icons/cross.png"
          width={32}
          height={32}
          alt="close"
          className="mr-4 size-8 cursor-pointer transition-transform duration-300 hover:rotate-90"
          onClick={onClose}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <ChooseLocation onSelectLocation={handleSelectLocation} />

        <ChooseCharacter />
      </div>
    </div>
  );
}

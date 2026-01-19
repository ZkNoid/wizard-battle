'use client';

import Image from 'next/image';
import { useState } from 'react';
import ChooseLocation from './ChooseLocation';
import ChooseCharacter from './ChooseCharacter';
import RewardsSection from './RewardsSection';
import { Button } from '../shared/Button';
import ExpeditionModalTitle from './components/ExpeditionModalTitle';

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
    <div className="flex h-full flex-col">
      <ExpeditionModalTitle title="Expedition" onClose={onClose} />

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
        <ChooseLocation onSelectLocation={handleSelectLocation} />

        <ChooseCharacter />

        <RewardsSection />
      </div>

      <div className="mx-10 mb-10 mt-4 pt-4">
        <Button
          variant="blue"
          onClick={() => {}}
          className="w-170 flex h-20 flex-row items-center justify-center gap-2.5"
          isLong
        >
          <span className="font-pixel text-main-gray whitespace-nowrap text-lg font-bold">
            Start Expedition
          </span>
        </Button>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useState } from 'react';
import ChooseLocation from './ChooseLocation';
import ChooseCharacter from './ChooseCharacter';
import RewardsSection from './RewardsSection';
import { Button } from '../shared/Button';
import ExpeditionModalTitle from './components/ExpeditionModalTitle';
import type { Field } from 'o1js';
import type { ExpeditionTimePeriod } from '@/lib/types/Expedition';

export default function NewExpeditionForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Field | string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<ExpeditionTimePeriod | null>(null);

  const handleSelectLocation = (location: number | null) => {
    setSelectedLocation(location);
    console.log(location);
  };

  const handleSelectCharacter = (character: Field | string | null) => {
    setSelectedCharacter(character);
    console.log(character);
  };

  const handleSelectTimePeriod = (timePeriod: ExpeditionTimePeriod | null) => {
    setSelectedTimePeriod(timePeriod);
    console.log(timePeriod);
  };

  const disabled = !selectedLocation || !selectedCharacter || !selectedTimePeriod;

  return (
    <div className="flex h-full flex-col">
      <ExpeditionModalTitle title="Expedition" onClose={onClose} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        <ChooseLocation onSelectLocation={handleSelectLocation} />

        <ChooseCharacter onSelectCharacter={handleSelectCharacter} onSelectTimePeriod={handleSelectTimePeriod} />

        <RewardsSection />
      </div>

      <div className="mb-1 pt-2">
        <Button
          variant={disabled ? 'gray' : 'blue'}  
          onClick={() => {}}
          className="w-full flex h-15 flex-row items-center justify-center gap-2.5"
          isLong
          disabled={disabled}
        >
          <span className="font-pixel text-main-gray whitespace-nowrap text-lg font-bold">
            Start Expedition
          </span>
        </Button>
      </div>
    </div>
  );
}

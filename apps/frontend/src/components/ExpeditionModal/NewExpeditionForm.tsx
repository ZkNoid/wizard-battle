'use client';

import { useState } from 'react';
import ChooseLocation from './ChooseLocation';
import ChooseCharacter from './ChooseCharacter';
import RewardsSection from './RewardsSection';
import { Button } from '../shared/Button';
import ExpeditionModalTitle from './components/ExpeditionModalTitle';
import type { Field } from 'o1js';
import type { ExpeditionTimePeriod } from '@wizard-battle/common';
import { useExpeditionStore } from '@/lib/store/expeditionStore';
import { allWizards } from '../../../../common/wizards';

export default function NewExpeditionForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const { createExpedition, isCreating } = useExpeditionStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Field | string | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<ExpeditionTimePeriod | null>(null);

  const handleSelectLocation = (location: string | null) => {
    setSelectedLocation(location);
  };

  const handleSelectCharacter = (character: Field | string | null) => {
    setSelectedCharacter(character);
  };

  const handleSelectTimePeriod = (timePeriod: ExpeditionTimePeriod | null) => {
    setSelectedTimePeriod(timePeriod);
  };

  const handleStartExpedition = async () => {
    if (!selectedLocation || !selectedCharacter || !selectedTimePeriod) return;

    const wizard = allWizards.find((w) => w.id.toString() === selectedCharacter.toString());
    if (!wizard) return;

    await createExpedition({
      characterId: selectedCharacter.toString(),
      characterRole: wizard.name,
      characterImage: wizard.imageURL || '',
      locationId: selectedLocation,
      timePeriod: selectedTimePeriod,
    });

    onClose();
  };

  const disabled = !selectedLocation || !selectedCharacter || !selectedTimePeriod || isCreating;

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
          onClick={handleStartExpedition}
          className="w-full flex h-15 flex-row items-center justify-center gap-2.5"
          isLong
          disabled={disabled}
        >
          <span className="font-pixel text-main-gray whitespace-nowrap text-lg font-bold">
            {isCreating ? 'Starting...' : 'Start Expedition'}
          </span>
        </Button>
      </div>
    </div>
  );
}

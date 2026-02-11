'use client';

import { useState } from 'react';
import ChooseLocation from './ChooseLocation';
import ChooseCharacter from './ChooseCharacter';
import RewardsSection from './RewardsSection';
import { Button } from '../shared/Button';
import ModalTitle from '../shared/ModalTitle';
import type { Field } from 'o1js';
import type { ExpeditionTimePeriod } from '@wizard-battle/common';
import { useExpeditionStore } from '@/lib/store/expeditionStore';
import { allWizards } from '../../../../common/wizards';
import { useMinaAppkit } from 'mina-appkit';
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';
import type { ExpeditionStartedProps } from '@/lib/analytics/types';

export default function NewExpeditionForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { address } = useMinaAppkit();
  const { createExpedition, isCreating } = useExpeditionStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<
    Field | string | null
  >(null);
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<ExpeditionTimePeriod | null>(null);

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
    if (
      !selectedLocation ||
      !selectedCharacter ||
      !selectedTimePeriod ||
      !address
    )
      return;

    const wizard = allWizards.find(
      (w) => w.id.toString() === selectedCharacter.toString()
    );
    if (!wizard) return;

    console.log(
      'Creating expedition with character:',
      wizard.name,
      'and location:',
      selectedLocation
    );

    await createExpedition(address, {
      characterId: selectedCharacter.toString(),
      characterRole: wizard.name,
      characterImage: wizard.imageURL || '',
      locationId: selectedLocation,
      timePeriod: selectedTimePeriod,
    });

    // Track expedition started
    const durationHours = 
      selectedTimePeriod === 'short' ? 1 : 
      selectedTimePeriod === 'medium' ? 4 : 8;
    const expeditionProps: ExpeditionStartedProps = {
      location_id: selectedLocation,
      character_id: selectedCharacter.toString(),
      duration: durationHours,
    };
    trackEvent(AnalyticsEvents.EXPEDITION_STARTED, expeditionProps);

    if (onSuccess) {
      onSuccess();
    }
  };

  const disabled =
    !selectedLocation ||
    !selectedCharacter ||
    !selectedTimePeriod ||
    isCreating ||
    !address;

  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Expedition" onClose={onClose} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        <ChooseLocation onSelectLocation={handleSelectLocation} />

        <ChooseCharacter
          onSelectCharacter={handleSelectCharacter}
          onSelectTimePeriod={handleSelectTimePeriod}
        />

        <RewardsSection />
      </div>

      <div className="mb-1 pt-2">
        <Button
          variant={disabled ? 'gray' : 'blue'}
          onClick={handleStartExpedition}
          className="h-15 flex w-full flex-row items-center justify-center gap-2.5"
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

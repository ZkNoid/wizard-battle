'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { allWizards, type Wizard } from '../../../../common/wizards';
import { Button } from '../shared/Button';
import WizardImageMini from './components/WizardImageMini';
import type { Field } from 'o1js';
import type { ExpeditionDuration, ExpeditionTimePeriod } from '@/lib/types/Expedition';

interface ChooseCharacterProps {
  onSelectCharacter: (character: Field | string | null) => void;
  onSelectTimePeriod: (timePeriod: ExpeditionTimePeriod | null) => void;
}

export default function ChooseCharacter({ onSelectCharacter, onSelectTimePeriod }: ChooseCharacterProps) {
  const [currentWizard, setCurrentWizard] = useState<Wizard>(allWizards[0]!);
  const [selectedDuration, setSelectedDuration] = useState<ExpeditionDuration>('1hour');

  const handlePrevWizard = () => {
    const currentIndex = allWizards.findIndex((w) => w.id === currentWizard.id);
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : allWizards.length - 1;
    setCurrentWizard(allWizards[prevIndex]!);
  };

  const handleNextWizard = () => {
    const currentIndex = allWizards.findIndex((w) => w.id === currentWizard.id);
    const nextIndex =
      currentIndex < allWizards.length - 1 ? currentIndex + 1 : 0;
    setCurrentWizard(allWizards[nextIndex]!);
  };

  useEffect(() => {
    onSelectCharacter(currentWizard.id.toString());
  }, [currentWizard]);

  useEffect(() => {
    onSelectTimePeriod(selectedDuration === '1hour' ? 1 : selectedDuration === '3hour' ? 3 : 24);
  }, [selectedDuration]);

  return (
    <div className="mx-0 mt-5 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-xl font-bold">
        Choose Character & Duration
      </span>
      <div className="flex w-full flex-row justify-center gap-4">
        <div className="flex items-center justify-center">
          {/* Hero Carousel */}
          <div className="flex items-center gap-1">
            {/* Left Arrow Button */}
            <button
              onClick={handlePrevWizard}
              className="transition-transform duration-300 hover:scale-110 flex-shrink-0"
            >
              <Image
                src="/inventory/arrow-left.png"
                width={60}
                height={80}
                alt="previous-wizard"
                className="h-10 w-8 object-contain object-center"
              />
            </button>

            {/* Wizard Image */}

            <WizardImageMini wizard={currentWizard} />

            {/* Right Arrow Button */}
            <button
              onClick={handleNextWizard}
              className="transition-transform duration-300 hover:scale-110 flex-shrink-0"
            >
              <Image
                src="/inventory/arrow-right.png"
                width={60}
                height={80}
                alt="next-wizard"
                className="h-10 w-8 object-contain object-center"
              />
            </button>
          </div>
        </div>
        <div className="flex-1 max-w-md">
          <div className="flex flex-col gap-2.5">
            <span className="font-pixel text-main-gray text-left text-xs font-thin">
              When a character is sent on an expedition, he is not available for
              other game actions until the expedition is over. You can interrupt
              expedition and claim less rewards if you want to return character.
            </span>
            <div className="flex flex-row justify-around gap-1">
              <Button
                variant={selectedDuration === '1hour' ? 'blue' : 'gray'}
                text="1 hour"
                onClick={() => setSelectedDuration('1hour')}
                className="px-6 py-1 text-xs min-w-28"
              />
              <Button
                variant={selectedDuration === '3hour' ? 'blue' : 'gray'}
                text="3 hour"
                onClick={() => setSelectedDuration('3hour')}
                className="px-6 py-1 text-xs min-w-28"
              />
              <Button
                variant={selectedDuration === '24hour' ? 'blue' : 'gray'}
                text="24 hour"
                onClick={() => setSelectedDuration('24hour')}
                className="px-6 py-4 text-sm min-w-28"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { allWizards, type Wizard } from '../../../../common/wizards';

export default function ChooseCharacter() {
  const [currentWizard, setCurrentWizard] = useState<Wizard>(allWizards[0]!);

  const getWizardImage = (wizard: Wizard) => {
    switch (wizard.name) {
      case 'Wizard':
        return '/inventory/carousel/mage.png';
      case 'Archer':
        return '/inventory/carousel/archer.png';
      case 'Phantom Duelist':
        return '/inventory/carousel/warrior.png';
      default:
        return '/inventory/carousel/mage.png';
    }
  };

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

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-2xl font-bold">
        Choose Character & Duration
      </span>
      <div className="flex w-full flex-row justify-center gap-10">
        <div className="flex w-[50%] items-center justify-center">
          {/* Hero Carousel */}
          <div className="flex items-center gap-5">
            {/* Left Arrow Button */}
            <button
              onClick={handlePrevWizard}
              className="transition-transform duration-300 hover:scale-110"
            >
              <Image
                src="/inventory/arrow-left.png"
                width={36}
                height={48}
                alt="previous-wizard"
                className="h-12 w-16 object-contain object-center"
              />
            </button>

            {/* Wizard Image */}
            <div className="size-35 flex-shrink-0">
              <Image
                src={getWizardImage(currentWizard)}
                width={120}
                height={120}
                alt={currentWizard.name}
                style={{ objectFit: 'contain', pointerEvents: 'none' }}
                draggable={false}
                className="size-full"
                quality={100}
                unoptimized={true}
              />
            </div>

            {/* Right Arrow Button */}
            <button
              onClick={handleNextWizard}
              className="transition-transform duration-300 hover:scale-110"
            >
              <Image
                src="/inventory/arrow-right.png"
                width={36}
                height={48}
                alt="next-wizard"
                className="h-12 w-16 object-contain object-center"
              />
            </button>
          </div>
        </div>
        <div className="w-full">
          <div className="flex flex-col gap-2.5">
            <span className="font-pixel text-main-gray text-left text-sm font-thin">
              When a character is sent on an expedition, he is not available for
              other game actions until the expedition is over. You can interrupt
              expedition and claim less rewards if you want to return character.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

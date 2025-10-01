'use client';

import { ArrowLeft } from './assets/arrow-left';
import { AvatarBg } from './assets/avatar-bg';
import Image from 'next/image';
import { allWizards, type Wizard } from '../../../../common/wizards';

export function Carousel({
  currentWizard,
  setCurrentWizard,
}: {
  currentWizard: Wizard;
  setCurrentWizard: (wizard: Wizard) => void;
}) {
  return (
    <div className="flex items-center gap-5">
      {/* Previous button */}
      <button
        onClick={() => {
          const currentIndex = allWizards.findIndex(
            (w) => w.id === currentWizard.id
          );
          const previousWizard = allWizards[currentIndex - 1];
          if (previousWizard) setCurrentWizard(previousWizard);
        }}
        className="cursor-pointer transition-transform duration-300 hover:scale-110"
      >
        <ArrowLeft className="h-22.5 w-20" />
      </button>
      {/* Wizard image */}
      <div className="w-106 h-143 relative overflow-hidden">
        {currentWizard.imageURL && (
          <Image
            src={currentWizard.imageURL}
            alt={'baseWizard'}
            fill
            className="h-full w-full p-6"
          />
        )}
        <AvatarBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
      {/* Next button */}
      <button
        onClick={() => {
          const currentIndex = allWizards.findIndex(
            (w) => w.id === currentWizard.id
          );
          const nextWizard = allWizards[currentIndex + 1];
          if (nextWizard) {
            setCurrentWizard(nextWizard);
          } else {
            setCurrentWizard(allWizards[0]!);
          }
        }}
        className="cursor-pointer transition-transform duration-300 hover:scale-110"
      >
        <ArrowLeft className="h-22.5 w-20 rotate-180" />
      </button>
    </div>
  );
}

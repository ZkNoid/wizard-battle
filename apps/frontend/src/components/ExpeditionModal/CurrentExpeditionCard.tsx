'use client';

import type { IExpedition } from '@wizard-battle/common';
import Image from 'next/image';
import WizardImageMini from './components/WizardImageMini';
import { allWizards } from '../../../../common/wizards';
import WizardRole from './components/WizardRole';
import { Button } from '../shared/Button';
import TimeToComplete from './components/TimeToComplete';
import ExpeditionLocation from './components/ExpeditionLocation';
import ExpeditionRewards from './components/ExpeditionRewards';
import { ExpeditionCardBg } from './assets/expedition-card-bg';

interface CurrentExpeditionCardProps {
  expedition: IExpedition;
  onInterruptExpedition: () => void;
}

export default function CurrentExpeditionCard({
  expedition,
  onInterruptExpedition,
}: CurrentExpeditionCardProps) {
  return (
    <div className="relative">
      <div className="w-full relative z-[1] flex flex-col gap-2 p-3">
        {/* First Row - Avatar and Info Column */}
        <div className="flex gap-2">
          {/* Column 1 - Character Avatar */}
          <div className="w-36 h-36 flex-shrink-0">
            <WizardImageMini
              wizard={allWizards.find(
                (w) => w.id.toString() === expedition.characterId.toString()
              ) ?? allWizards[0]!}
            />
          </div>

          {/* Column 2 - Info Rows */}
          <div className="flex flex-1 flex-col gap-1 min-w-0 justify-between mb-1">
            {/* Row 1 - Timer and Location */}
            <div className="flex gap-1">
              <TimeToComplete timeToComplete={expedition.timeToComplete} />
              <ExpeditionLocation location={expedition.locationName} />
            </div>

            {/* Row 2 - Rewards */}
            <ExpeditionRewards rewards={expedition.rewards} />
          </div>
        </div>

        {/* Second Row - Role and Interrupt Button */}
        <div className="flex items-center gap-2">
          {/* Character Role */}
          <div className="flex-shrink-0">
            <WizardRole role={expedition.characterRole} />
          </div>

          {/* Interrupt Button */}
          <Button 
            variant="blue" 
            className="h-15 flex-1 min-w-0" 
            isLong 
            onClick={onInterruptExpedition}
            enableHoverSound
            enableClickSound
          >
            <span className="truncate">Interrupt Expedition</span>
          </Button>
        </div>
      </div>

      <ExpeditionCardBg className="pointer-events-none absolute inset-0 -z-[1] size-full" />
    </div>
  );
}

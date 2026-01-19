'use client';

import type { IExpedition } from '@/lib/types/Expedition';
import Image from 'next/image';
import WizardImageMini from './components/WizardImageMini';
import { State } from '../../../../common/stater/state';
import WizardRole from './components/WizardRole';
import { Button } from '../shared/Button';
import TimeToComplete from './components/TimeToComplete';
import ExpeditionLocation from './components/ExpeditionLocation';
import ExpeditionRewards from './components/ExpeditionRewards';
import { ExpeditionCardBg } from './assets/expedition-card-bg';

interface CurrentExpeditionCardProps {
  expedition: IExpedition;
}

export default function CurrentExpeditionCard({
  expedition,
}: CurrentExpeditionCardProps) {
  return (
    <div className="relative p-4">
      <div className="max-w-185 relative z-[1] flex flex-col gap-3 p-5">
        {/* First Row - Avatar and Info Column */}
        <div className="flex gap-4">
          {/* Column 1 - Character Avatar */}
          <div className="w-1/4">
            <WizardImageMini
              wizard={{
                id: expedition.characterId,
                name: expedition.characterRole,
                defaultHealth: 100,
                defaultState: () => State.default(),
              }}
            />
          </div>

          {/* Column 2 - Info Rows */}
          <div className="flex flex-1 flex-col gap-2 mr-5">
            {/* Row 1 - Timer and Location */}
            <div className="flex gap-2">
              <TimeToComplete timeToComplete={expedition.timeToComplete} />
              <ExpeditionLocation location={expedition.locationName} />
            </div>

            {/* Row 2 - Rewards */}
            <ExpeditionRewards rewards={expedition.rewards} />
          </div>
        </div>

        {/* Second Row - Role and Interrupt Button */}
        <div className="flex items-center gap-4">
          {/* Character Role */}
          <div className="w-1/4">
            <WizardRole role={expedition.characterRole} />
          </div>

          {/* Interrupt Button */}
          <Button variant="blue" className="h-15 flex-1 w-3/4" isLong>
            <span>Interrupt Expedition</span>
          </Button>
        </div>
      </div>

      <ExpeditionCardBg className="pointer-events-none absolute inset-0 -z-[1] size-full" />
    </div>
  );
}

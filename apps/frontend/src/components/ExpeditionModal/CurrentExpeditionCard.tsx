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
    <div className="relative border-8 border-black bg-[#d4d4dc] p-4">
      {/* Outer border styling */}
      <div className="pointer-events-none absolute inset-0 border-4 border-white"></div>

      <div className="flex gap-4">
        {/* Left side - Character */}
        <div className="flex flex-col gap-3">
          {/* Character Avatar */}
          <WizardImageMini
            wizard={{
              id: expedition.characterId,
              name: expedition.characterRole,
              defaultHealth: 100,
              defaultState: () => State.default(),
            }}
          />

          {/* Character Role */}
          <WizardRole role={expedition.characterRole} />
        </div>

        {/* Right side - Expedition Info */}
        <div className="flex flex-1 flex-col gap-1">
          {/* Top Row - Timer and Location */}
          <div className="flex gap-1">
            {/* Timer */}
            <TimeToComplete timeToComplete={expedition.timeToComplete} />

            {/* Location */}
            <ExpeditionLocation location={expedition.locationName} />
          </div>

          {/* Rewards Section */}
          <ExpeditionRewards rewards={expedition.rewards} />

          {/* Interrupt Button */}
          <Button variant="blue" className="h-15 mt-1 w-full">
            <span>Interrupt Expedition</span>
          </Button>
        </div>
      </div>

      {/* <ExpeditionCardBg className="absolute bottom-0 left-0" /> */}
    </div>
  );
}

'use client';

import { CURRENT_EXPEDITIONS } from '@/lib/constants/expedition';
import CurrentExpeditionCard from './CurrentExpeditionCard';
import Image from 'next/image';
import ExpeditionModalTitle from './components/ExpeditionModalTitle';

export default function CurrentExpeditionsForm({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ExpeditionModalTitle title="Current Expeditions" onClose={onClose} />

      {/* Scrollable Expeditions List */}
      <div className="flex-1 overflow-y-auto pb-10 pr-2">
        <div className="flex flex-col gap-4">
          {CURRENT_EXPEDITIONS.length > 0 ? (
            CURRENT_EXPEDITIONS.map((expedition) => (
              <CurrentExpeditionCard
                key={expedition.id}
                expedition={expedition}
              />
            ))
          ) : (
            <div className="flex items-center justify-center py-12">
              <span className="font-['Press_Start_2P'] text-xl text-gray-500">
                No active expeditions
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

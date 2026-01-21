'use client';

import { useState } from 'react';
import { CURRENT_EXPEDITIONS } from '@/lib/constants/expedition';
import CurrentExpeditionCard from './CurrentExpeditionCard';
import Image from 'next/image';
import ExpeditionModalTitle from './components/ExpeditionModalTitle';
import ConfirmModal from '../shared/ConfirmModal';

export default function CurrentExpeditionsForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string | null>(null);

  const onInterruptExpedition = (expeditionId: string) => {
    setSelectedExpeditionId(expeditionId);
    setShowConfirmModal(true);
  };

  const handleConfirmInterrupt = () => {
    if (selectedExpeditionId) {
      console.log(`Interrupting expedition ${selectedExpeditionId}`);
      // Здесь будет логика прерывания экспедиции
    }
    setShowConfirmModal(false);
    setSelectedExpeditionId(null);
  };

  const handleCancelInterrupt = () => {
    setShowConfirmModal(false);
    setSelectedExpeditionId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <ExpeditionModalTitle title="Current Expeditions" onClose={onClose} />

      {/* Scrollable Expeditions List */}
      <div className="flex-1 overflow-y-auto pb-2 pr-2">
        <div className="flex flex-col gap-2">
          {CURRENT_EXPEDITIONS.length > 0 ? (
            CURRENT_EXPEDITIONS.map((expedition) => (
              <CurrentExpeditionCard
                key={expedition.id}
                expedition={expedition}
                onInterruptExpedition={() => onInterruptExpedition(expedition.id)}
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

      {/* Confirm Modal */}
      {showConfirmModal && (
        <ConfirmModal
          title="Interrupt Expedition"
          description="If you interrupt the expedition, you will receive only a part of the promised rewards. Are you sure you want to abort the expedition?"
          onConfirm={handleConfirmInterrupt}
          onCancel={handleCancelInterrupt}
          confirmButtonText="Interrupt"
          cancelButtonText="Cancel"
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useExpeditionStore } from '@/lib/store/expeditionStore';
import CurrentExpeditionCard from './CurrentExpeditionCard';
import ModalTitle from '../shared/ModalTitle';
import ConfirmModal from '../shared/ConfirmModal';
import { useMinaAppkit } from 'mina-appkit';
import { useInventoryStore } from '@/lib/store';

export default function CurrentExpeditionsForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const { address } = useMinaAppkit();
  const {
    expeditions,
    isLoading,
    completeExpedition,
    interruptExpedition,
    loadUserExpeditions,
  } = useExpeditionStore();
  const { loadUserInventory } = useInventoryStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<
    string | null
  >(null);

  // Load expeditions when component mounts or address changes
  useEffect(() => {
    if (address) {
      loadUserExpeditions(address);
    }
  }, [address, loadUserExpeditions]);

  // Filter to show active expeditions
  const activeExpeditions = expeditions.filter(
    (exp) => exp.status === 'active'
  );

  const onInterruptExpedition = (expeditionId: string) => {
    setSelectedExpeditionId(expeditionId);
    setShowConfirmModal(true);
  };
  const onCompleteExpedition = async (expeditionId: string) => {
    setSelectedExpeditionId(expeditionId);
    await handleConfirmComplition();
    if (address) {
      await loadUserInventory(address);
    }
  };

  const handleConfirmInterrupt = async () => {
    if (selectedExpeditionId && address) {
      await interruptExpedition(address, selectedExpeditionId);
      await loadUserInventory(address);
    }
    setShowConfirmModal(false);
    setSelectedExpeditionId(null);
  };

  const handleConfirmComplition = async () => {
    if (selectedExpeditionId && address) {
      await completeExpedition(address, selectedExpeditionId);
    }
  };

  const handleCancelInterrupt = () => {
    setShowConfirmModal(false);
    setSelectedExpeditionId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <ModalTitle title="Current Expeditions" onClose={onClose} />

      {/* Scrollable Expeditions List */}
      <div className="flex-1 overflow-y-auto pb-2 pr-2">
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="font-['Press_Start_2P'] text-xl text-gray-500">
                Loading...
              </span>
            </div>
          ) : activeExpeditions.length > 0 ? (
            activeExpeditions.map((expedition) => (
              <CurrentExpeditionCard
                key={expedition.id}
                expedition={expedition}
                onInterruptExpedition={() =>
                  onInterruptExpedition(expedition.id)
                }
                onCompleteExpedition={() => onCompleteExpedition(expedition.id)}
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

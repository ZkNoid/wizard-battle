'use client';

import InventoryModal from '../InventoryModal';
import CraftModal from '../CraftModal';
import ExpeditionModal from '../ExpeditionModal';
import TestnetModal from '../TestnetModal';
import QuickGuideModal from '../QuickGuideModal';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';

export default function Modals() {
  const {
    isInventoryModalOpen,
    setIsInventoryModalOpen,
    isCraftModalOpen,
    setIsCraftModalOpen,
    isExpeditionModalOpen,
    setIsExpeditionModalOpen,
    isTestnetModalOpen,
    setIsTestnetModalOpen,
    isQuickGuideModalOpen,
    setIsQuickGuideModalOpen,
  } = useMiscellaneousSessionStore();

  return (
    <>
      {isInventoryModalOpen && (
        <InventoryModal onClose={() => setIsInventoryModalOpen(false)} />
      )}

      {isCraftModalOpen && (
        <CraftModal onClose={() => setIsCraftModalOpen(false)} />
      )}

      {isExpeditionModalOpen && (
        <ExpeditionModal onClose={() => setIsExpeditionModalOpen(false)} />
      )}

      {isTestnetModalOpen && (
        <TestnetModal onClose={() => setIsTestnetModalOpen(false)} />
      )}

      {isQuickGuideModalOpen && (
        <QuickGuideModal onClose={() => setIsQuickGuideModalOpen(false)} />
      )}
    </>
  );
}

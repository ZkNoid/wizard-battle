'use client';

import { CraftModalForm } from './CraftModalForm';
import { InventoryModalForm } from '../InventoryModalForm';
import { useState, useCallback } from 'react';
import type { IUserInventoryItem } from '@/lib/types/Inventory';
import { useModalSound } from '@/lib/hooks/useAudio';
import { useMinaAppkit } from 'mina-appkit';

export default function CraftModal({ onClose }: { onClose: () => void }) {
  // Play modal sounds
  useModalSound();

  // Get wallet address
  const { address } = useMinaAppkit();

  const [draggedItem, setDraggedItem] = useState<IUserInventoryItem | null>(
    null
  );

  const handleItemDragStart = useCallback((userItem: IUserInventoryItem) => {
    setDraggedItem(userItem);
  }, []);

  const handleItemDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleItemRemove = useCallback((userItem: IUserInventoryItem) => {
    // TODO: Add logic here to update inventory on the server
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <CraftModalForm onClose={onClose} address={address} />
      <InventoryModalForm
        onClose={onClose}
        onItemDragStart={handleItemDragStart}
        onItemDragEnd={handleItemDragEnd}
        onItemRemove={handleItemRemove}
        draggedItem={draggedItem}
      />
    </div>
  );
}

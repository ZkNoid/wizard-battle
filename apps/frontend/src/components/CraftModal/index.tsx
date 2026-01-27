'use client';

import { CraftModalForm } from './CraftModalForm';
import { InventoryModalForm } from '../InventoryModalForm';
import { useState, useCallback } from 'react';
import type { IInventoryItem } from '@/lib/types/Inventory';
import { useModalSound } from '@/lib/hooks/useAudio';

export default function CraftModal({ onClose }: { onClose: () => void }) {
  // Play modal sounds
  useModalSound();

  const [draggedItem, setDraggedItem] = useState<IInventoryItem | null>(null);

  const handleItemDragStart = useCallback((item: IInventoryItem) => {
    setDraggedItem(item);
  }, []);

  const handleItemDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleItemRemove = useCallback((item: IInventoryItem) => {
    // TODO: Add logic here to update inventory on the server
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <CraftModalForm onClose={onClose} />
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

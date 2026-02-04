'use client';

import { CraftModalForm } from './CraftModalForm';
import { InventoryModalForm } from '../InventoryModalForm';
import { useState, useCallback } from 'react';
import type { IUserInventoryItem } from '@/lib/types/Inventory';

export default function CraftModal({ onClose }: { onClose: () => void }) {
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

'use client';

import { CraftModalForm } from './CraftModalForm';
import { InventoryModalForm } from '../InventoryModalForm';

export default function CraftModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <CraftModalForm />
      <InventoryModalForm onClose={onClose} />
    </div>
  );
}

'use client';

import ModalTitle from '../shared/ModalTitle';
import { BuyItemsFilterPanel } from './BuyItemsFilterPanel';

interface BuyItemsFormProps {
  onClose?: () => void;
}

export function BuyItemsForm({ onClose }: BuyItemsFormProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <ModalTitle title="P2P Market" onClose={onClose} />

      <BuyItemsFilterPanel />

      <span>Items...</span>
    </div>
  );
}

'use client';

import { MarketModalForm } from './MarketModalForm';
import { useModalSound } from '@/lib/hooks/useAudio';

export default function MarketModal({ onClose }: { onClose: () => void }) {
  useModalSound();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <MarketModalForm onClose={onClose} />
    </div>
  );
}

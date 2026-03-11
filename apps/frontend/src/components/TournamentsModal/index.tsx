'use client';

import { useModalSound } from '@/lib/hooks/useAudio';
import { TournamentsModalForm } from './TournamentsModalForm';

export default function TournamentsModal({ onClose }: { onClose: () => void }) {
  useModalSound();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <TournamentsModalForm onClose={onClose} />
    </div>
  );
}

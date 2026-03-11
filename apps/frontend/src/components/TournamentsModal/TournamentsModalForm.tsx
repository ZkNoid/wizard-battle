'use client';

import { TournamentsModalBg } from './assets/tournaments-modal-bg';
import { TournamentsForm } from './TournamentsForm';

interface TournamentsModalFormProps {
  onClose?: () => void;
}

export function TournamentsModalForm({ onClose }: TournamentsModalFormProps) {
  return (
    <div className="w-320 h-200 relative" onClick={(e) => e.stopPropagation()}>
      <div className="relative z-10 h-full w-full">
        <div className="h-full w-full px-4 py-4">
          <TournamentsForm onClose={onClose} />
        </div>
        <TournamentsModalBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}

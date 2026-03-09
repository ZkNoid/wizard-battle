'use client';

import { MarketModalBg } from '../MarketModal/assets/market-modal-bg';
import { TournamentsForm } from './TournamentsForm';

interface TournamentsModalFormProps {
  onClose?: () => void;
}

export function TournamentsModalForm({ onClose }: TournamentsModalFormProps) {
  return (
    <div className="w-320 h-220 relative" onClick={(e) => e.stopPropagation()}>
      <div className="h-full relative z-10 w-full">
        <div className="h-full w-full px-4 py-4">
          <TournamentsForm onClose={onClose} />
        </div>
        <MarketModalBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}

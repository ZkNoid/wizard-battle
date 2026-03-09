'use client';

import ModalTitle from '../shared/ModalTitle';

interface TournamentsFormProps {
  onClose?: () => void;
}

export function TournamentsForm({ onClose }: TournamentsFormProps) {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <ModalTitle title="Tournaments" onClose={onClose ?? (() => {})} />
    </div>
  );
}

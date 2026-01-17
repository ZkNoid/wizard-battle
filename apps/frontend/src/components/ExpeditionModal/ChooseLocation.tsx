'use client';

import { LOCATIONS } from '@/lib/constants/expedition';
import { useEffect, useState } from 'react';
import { SelectableImage } from '@/components/shared/SelectableImage';

export default function ChooseLocation({
  onSelectLocation,
}: {
  onSelectLocation: (location: number | null) => void;
}) {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);

  useEffect(() => {
    onSelectLocation(selectedLocation);
  }, [selectedLocation]);

  return (
    <div className="mt-8 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-2xl font-bold">
        Choose location
      </span>
      <div className="flex flex-row justify-center gap-10">
        {LOCATIONS.map((location) => (
          <SelectableImage
            key={location.id}
            src={location.image}
            alt={location.name}
            isSelected={selectedLocation === location.id}
            onClick={() => setSelectedLocation(location.id)}
          />
        ))}
      </div>
    </div>
  );
}

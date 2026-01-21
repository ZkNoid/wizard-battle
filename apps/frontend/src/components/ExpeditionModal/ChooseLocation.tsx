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

  const handleSelectLocation = (location: number) => {
    if (location === selectedLocation) {
      setSelectedLocation(null);
      
      return;
    }
    setSelectedLocation(location);
  };

  useEffect(() => {
    onSelectLocation(selectedLocation);
  }, [selectedLocation]);

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-xl font-bold">
        Choose location
      </span>
      <div className="flex flex-row justify-center gap-3 flex-wrap">
        {LOCATIONS.map((location) => (
          <SelectableImage
            key={location.id}
            src={location.image}
            alt={location.name}
            name={location.name}
            isSelected={selectedLocation === location.id}
            onClick={() => handleSelectLocation(location.id)}
            width={140}
            height={140}
          />
        ))}
      </div>
    </div>
  );
}

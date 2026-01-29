'use client';

import { useEffect, useState } from 'react';
import { SelectableImage } from '@/components/shared/SelectableImage';
import { useExpeditionStore } from '@/lib/store/expeditionStore';

export default function ChooseLocation({
  onSelectLocation,
}: {
  onSelectLocation: (location: string | null) => void;
}) {
  const { locations, loadLocations } = useExpeditionStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Load locations from store on mount
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleSelectLocation = (locationId: string) => {
    if (locationId === selectedLocation) {
      setSelectedLocation(null);
      return;
    }
    setSelectedLocation(locationId);
  };

  useEffect(() => {
    onSelectLocation(selectedLocation);
  }, [selectedLocation, onSelectLocation]);

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-xl font-bold">
        Choose location
      </span>
      <div className="flex flex-row justify-center gap-3 flex-wrap">
        {locations.map((location) => (
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

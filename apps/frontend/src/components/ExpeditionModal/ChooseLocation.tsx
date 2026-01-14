'use client';

import { LOCATIONS } from '@/lib/constants/location';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col gap-2.5">
      <span className="font-pixel text-main-gray text-center text-2xl font-bold">
        Choose location
      </span>
      <div className="flex flex-row justify-center gap-10">
        {LOCATIONS.map((location) => (
          <div
            key={location.id}
            onClick={() => setSelectedLocation(location.id)}
            className={cn('cursor-pointer')}
          >
            <Image
              src={location.image}
              alt={location.name}
              width={100}
              height={100}
              className="size-40 object-contain object-center"
              unoptimized={true}
              quality={100}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

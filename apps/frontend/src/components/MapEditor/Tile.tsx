'use client';

import { TileBorder } from './assets/tile-border';
import Image from 'next/image';

export function Tile({
  image,
  title,
  description,
  onClick,
}: {
  image: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="max-w-100 flex flex-col gap-1">
      <span className="font-pixel text-main-gray mr-auto text-lg font-bold">
        {title}
      </span>
      <div className="flex flex-row items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="relative size-20 overflow-hidden">
            <Image
              src={image}
              alt={title}
              width={48}
              height={48}
              quality={100}
              unoptimized={true}
              className="size-18 absolute inset-1"
            />
            <TileBorder className="absolute inset-0 -z-[1] h-full w-full" />
          </div>
          {/* Here be tiles count */}
        </div>
        <span className="font-pixel text-main-gray text-left text-xs">
          {description}
        </span>
      </div>
    </button>
  );
}

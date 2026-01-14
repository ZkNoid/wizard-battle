'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DefaultImgBorder } from './assets/default-img.border';
import { ActiveImgBorder } from './assets/active-img.border';

export interface SelectableImageProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick?: () => void;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
}

export function SelectableImage({
  src,
  alt,
  isSelected,
  onClick,
  width = 100,
  height = 100,
  className,
  imageClassName,
}: SelectableImageProps) {
  return (
    <div
      onClick={onClick}
      className={cn('relative h-40 w-40 cursor-pointer', className)}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn('size-40 object-contain object-center', imageClassName)}
        style={{
          clipPath:
            'polygon(8% 0%, 92% 0%, 96% 4%, 100% 8%, 100% 92%, 96% 96%, 92% 100%, 8% 100%, 4% 96%, 0% 92%, 0% 8%, 4% 4%)',
        }}
        unoptimized={true}
        quality={100}
      />
      {isSelected ? (
        <ActiveImgBorder className="pointer-events-none absolute inset-0 h-40 w-40" />
      ) : (
        <DefaultImgBorder className="pointer-events-none absolute inset-0 h-40 w-40" />
      )}
    </div>
  );
}

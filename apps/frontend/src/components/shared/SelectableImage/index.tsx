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
  className?: string;
  imageClassName?: string;
  name?: string;
  disabled?: boolean;
}

export function SelectableImage({
  src,
  alt,
  isSelected,
  onClick,
  className,
  imageClassName,
  name,
  disabled = false,
}: SelectableImageProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        'relative',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={cn('object-contain object-center', imageClassName)}
        style={{
          clipPath:
            'polygon(8% 0%, 92% 0%, 96% 4%, 100% 8%, 100% 92%, 96% 96%, 92% 100%, 8% 100%, 4% 96%, 0% 92%, 0% 8%, 4% 4%)',
        }}
        unoptimized={true}
        quality={100}
      />
      {isSelected ? (
        <ActiveImgBorder className="pointer-events-none absolute inset-0 h-full w-full" />
      ) : (
        <DefaultImgBorder className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
      {isSelected && name && (
        <div
          className="font-pixel pointer-events-none absolute bottom-0 left-0 right-0 flex min-h-6 items-center justify-center py-1 text-center text-xs text-black h-[35%]"
          style={{
            backgroundColor: '#5B7AC4',
            clipPath:
              'polygon(0% 0%, 100% 0%, 100% 75%, 95% 85%, 85% 100%, 15% 100%, 5% 85%, 0% 75%)',
          }}
        >
          <span className="font-pixel text-main-gray text-bold text-xs">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

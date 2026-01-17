import { Button } from '@/components/shared/Button';
import Image from 'next/image';

export default function ExpeditionLocation({ location }: { location: string }) {
  return (
    <Button variant="lightGray" className="h-20 w-80">
      <span className="flex w-full items-center gap-2 px-4">
        <Image
          src="/icons/pin.png"
          width={16}
          height={16}
          alt="location-icon"
          className="size-8 object-contain object-center"
        />
        <span>{location}</span>
      </span>
    </Button>
  );
}

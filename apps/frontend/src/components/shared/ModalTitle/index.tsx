import Image from 'next/image';
import { useClickSound, useHoverSound } from '@/lib/hooks/useAudio';
import { Button } from '../Button';

export default function ModalTitle({
  title,
  onClose,
  onBack,
  textSizeClass = 'text-3.5xl',
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  textSizeClass?: string;
}) {
  const playClickSound = useClickSound();
  const playHoverSound = useHoverSound();

  return (
    <div className="font-pixel text-main-gray relative w-full pt-0 text-3xl font-bold">
      {onBack && (
        <Button
          variant="blue"
          className="w-35 absolute left-2 top-1/2 flex h-12 -translate-y-1/2 items-center gap-1 text-sm"
          onClick={() => {
            playClickSound();
            onBack();
          }}
        >
          Back
        </Button>
      )}
      <div className={`mt-6 w-full text-center ${textSizeClass}`}>{title}</div>
      <Image
        src="/icons/cross.png"
        width={30}
        height={30}
        alt="close"
        className="absolute right-2 top-2 size-10 cursor-pointer transition-transform duration-300 hover:rotate-90"
        onClick={() => {
          playClickSound();
          onClose();
        }}
        onMouseEnter={playHoverSound}
      />
    </div>
  );
}

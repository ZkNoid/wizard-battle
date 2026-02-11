import Image from 'next/image';
import { useClickSound, useHoverSound } from '@/lib/hooks/useAudio';

export default function ModalTitle({
  title,
  onClose,
  textSizeClass = 'text-4xl',
}: {
  title: string;
  onClose: () => void;
  textSizeClass?: string;
}) {
  const playClickSound = useClickSound();
  const playHoverSound = useHoverSound();

  return (
    <div className="font-pixel text-main-gray relative w-full pt-0 text-3xl font-bold">
      <div className={`mt-4 w-full text-center ${textSizeClass}`}>{title}</div>
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

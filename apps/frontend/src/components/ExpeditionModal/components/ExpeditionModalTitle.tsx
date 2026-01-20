import Image from 'next/image';

export default function ExpeditionModalTitle({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="font-pixel text-main-gray relative w-full pt-0 text-3xl font-bold">
      <div className="mt-4 w-full text-center text-4xl">{title}</div>
      <Image
        src="/icons/cross.png"
        width={30}
        height={30}
        alt="close"
        className="absolute right-2 top-2 size-10 cursor-pointer transition-transform duration-300 hover:rotate-90"
        onClick={onClose}
      />
    </div>
  );
}

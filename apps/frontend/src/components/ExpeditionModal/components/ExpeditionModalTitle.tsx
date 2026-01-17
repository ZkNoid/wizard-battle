import Image from 'next/image';

export default function ExpeditionModalTitle({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="font-pixel text-main-gray relative w-full pb-5 pt-2.5 text-3xl font-bold">
      <div className="mt-6 w-full text-center">{title}</div>
      <Image
        src="/icons/cross.png"
        width={40}
        height={40}
        alt="close"
        className="absolute right-6 top-6 size-10 cursor-pointer transition-transform duration-300 hover:rotate-90"
        onClick={onClose}
      />
    </div>
  );
}

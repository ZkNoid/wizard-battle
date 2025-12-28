import Image from 'next/image';

export function CraftFormItem({ item }: { item: any }) {
  return (
    <div>
      <div>
        <Image src={item.image} alt={item.title} width={32} height={32} />
      </div>
    </div>
  );
}

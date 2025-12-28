import type { ICraftItem } from '@/lib/types/Creaft';
import Image from 'next/image';
import { Button } from '../shared/Button';

export function CraftFormItem({ item }: { item: ICraftItem }) {
  const buttonClassName =
    'flex h-10 flex-row items-center justify-center gap-2 px-4';

  return (
    <div className="flex w-full flex-row items-center gap-3 text-sm">
      <Image
        src={item.image}
        alt={item.title}
        width={32}
        height={32}
        className="shrink-0"
      />
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-pixel text-main-gray font-bold">
          {item.title}
        </span>
        <span className="font-pixel text-xs">
          Recipe: {item.recipe.map((item) => item.title).join(', ')}
        </span>
      </div>
      <Button variant={'gray'} className={buttonClassName} onClick={() => {}}>
        <span>Craft</span>
      </Button>
    </div>
  );
}

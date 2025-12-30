import type { ICraftItem } from '@/lib/types/Creaft';
import Image from 'next/image';
import { Button } from '../shared/Button';
import { CraftRecipe } from './CraftRecipe';

export function CraftFormItem({ item }: { item: ICraftItem }) {
  const buttonClassName =
    'flex h-10 flex-row items-center justify-center gap-2 px-4';

  return (
    <div className="flex w-full flex-row items-center gap-4 text-sm">
      <Image
        src={item.image}
        alt={item.title}
        width={40}
        height={40}
        className="shrink-0 bg-gray-400"
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="font-pixel font-bold">{item.title}</span>
        <div className="flex flex-row items-center gap-2">
          <span className="font-pixel text-xs">Recipe:</span>
          <CraftRecipe recipe={item.recipe} />
        </div>
      </div>
      <Button variant={'green'} className={buttonClassName} onClick={() => {}}>
        <span>Craft</span>
      </Button>
    </div>
  );
}

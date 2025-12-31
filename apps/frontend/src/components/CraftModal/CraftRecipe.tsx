import type { ICraftRecipeItem } from '@/lib/types/Creaft';
import Image from 'next/image';

interface CraftRecipeProps {
  recipe: ICraftRecipeItem[];
  userInventory?: Map<string, number>; // Optional: map of item id to amount user has
}

export function CraftRecipe({ recipe, userInventory }: CraftRecipeProps) {
  const getUserAmount = (itemId: string): number => {
    return userInventory?.get(itemId) ?? 0;
  };

  const hasEnough = (itemId: string, required: number): boolean => {
    return getUserAmount(itemId) >= required;
  };

  return (
    <div className="flex flex-row items-center gap-6 text-[8px]">
      {recipe.map((item) => {
        const userAmount = getUserAmount(item.id);
        const hasEnoughAmount = hasEnough(item.id, item.requiredAmount);
        const amountColor = hasEnoughAmount ? 'text-green-500' : 'text-red-500';

        return (
          <div key={item.id} className="flex flex-row items-center gap-1.5">
            <Image
              src={`/items/${item.image}`}
              alt={item.title}
              width={24}
              height={24}
              className="shrink-0 object-contain"
            />
            <span className="font-pixel whitespace-nowrap">{item.title}:</span>
            <span className={`font-pixel whitespace-nowrap ${amountColor}`}>
              {userAmount}/{item.requiredAmount}
            </span>
          </div>
        );
      })}
    </div>
  );
}

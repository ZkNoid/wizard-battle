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
    <div className="flex flex-row items-center gap-4">
      {recipe.map((item, index) => {
        const userAmount = getUserAmount(item.id);
        const hasEnoughAmount = hasEnough(item.id, item.requiredAmount);
        const amountColor = hasEnoughAmount ? 'text-green-500' : 'text-red-500';

        return (
          <div key={item.id} className="flex flex-row items-center gap-2">
            <div className="flex flex-row items-center gap-2">
              <Image
                src={`/items/${item.image}`}
                alt={item.title}
                width={24}
                height={24}
                className="object-contain"
              />
              <span className="font-pixel text-xs">{item.title}:</span>
              <span className={`font-pixel text-xs font-bold ${amountColor}`}>
                {userAmount}/{item.requiredAmount}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

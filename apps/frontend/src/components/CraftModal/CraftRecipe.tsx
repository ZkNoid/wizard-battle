import type { ICraftRecipeIngredient } from '@/lib/types/Craft';
import Image from 'next/image';

interface CraftRecipeProps {
  ingredients: ICraftRecipeIngredient[];
  userInventory?: Map<string, number>; // Optional: map of item id to amount user has
}

export function CraftRecipe({ ingredients, userInventory }: CraftRecipeProps) {
  const getUserAmount = (itemId: string): number => {
    return userInventory?.get(itemId) ?? 0;
  };

  const hasEnough = (itemId: string, required: number): boolean => {
    return getUserAmount(itemId) >= required;
  };

  return (
    <div className="flex flex-row items-center gap-6 text-[12px]">
      {ingredients.map((ingredient) => {
        const userAmount = getUserAmount(ingredient.item.id);
        const hasEnoughAmount = hasEnough(ingredient.item.id, ingredient.requiredAmount);
        const amountColor = hasEnoughAmount ? 'text-green-500' : 'text-red-500';

        return (
          <div key={ingredient.item.id} className="flex flex-row items-center gap-1.5">
            <Image
              src={ingredient.item.image.startsWith('/') ? ingredient.item.image : `/items/${ingredient.item.image}`}
              alt={ingredient.item.title}
              width={24}
              height={24}
              className="shrink-0 object-contain"
            />
            <span className="font-pixel whitespace-nowrap">{ingredient.item.title}:</span>
            <span className={`font-pixel whitespace-nowrap ${amountColor}`}>
              {userAmount}/{ingredient.requiredAmount}
            </span>
          </div>
        );
      })}
    </div>
  );
}

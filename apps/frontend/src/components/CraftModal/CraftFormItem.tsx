import type { ICraftRecipe } from '@/lib/types/Craft';
import Image from 'next/image';
import { Button } from '../shared/Button';
import { CraftRecipe } from './CraftRecipe';
import { useInventoryStore } from '@/lib/store';
import { useMemo } from 'react';

export function CraftFormItem({ recipe }: { recipe: ICraftRecipe }) {
  const buttonClassName =
    'flex h-8 flex-row items-center justify-center px-4 shrink-0';

  const inventoryItems = useInventoryStore((state) => state.inventoryItems);

  // Create a map of item id to quantity for quick lookup
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    inventoryItems.forEach((userItem) => {
      map.set(userItem.item.id, userItem.quantity);
    });
    return map;
  }, [inventoryItems]);

  // Check if user has enough resources for crafting
  const hasEnoughResources = useMemo(() => {
    return recipe.ingredients.every((ingredient) => {
      const userQuantity = inventoryMap.get(ingredient.item.id) ?? 0;
      return userQuantity >= ingredient.requiredAmount;
    });
  }, [recipe.ingredients, inventoryMap]);

  return (
    <div className="flex w-full flex-row items-center gap-2 text-sm">
      <Image
        src={recipe.image}
        alt={recipe.title}
        width={40}
        height={40}
        className="size-10 shrink-0 bg-gray-400"
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span className="font-pixel truncate font-bold">{recipe.title}</span>
        <div className="flex min-w-0 flex-row items-center gap-2">
          <span className="font-pixel shrink-0 text-[12px]">Recipe:</span>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <CraftRecipe ingredients={recipe.ingredients} userInventory={inventoryMap} />
          </div>
        </div>
      </div>
      <Button
        variant={hasEnoughResources ? 'green' : 'gray'}
        className={`${buttonClassName} shrink-0`}
        onClick={() => {}}
      >
        <span>Craft</span>
      </Button>
    </div>
  );
}

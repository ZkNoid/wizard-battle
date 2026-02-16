import type { ICraftRecipe, ICraftRecipeIngredient } from '@/lib/types/Craft';
import Image from 'next/image';
import { Button } from '../shared/Button';
import { CraftRecipe } from './CraftRecipe';
import { useInventoryStore } from '@/lib/store';
import { useCraftStore } from '@/lib/store/craftStore';
import { useMemo, useState } from 'react';
import { api } from '@/trpc/react';

export function CraftFormItem({
  recipe,
  address,
}: {
  recipe: ICraftRecipe;
  address?: string;
}) {
  const buttonClassName =
    'flex h-8 flex-row items-center justify-center px-4 shrink-0';

  const [isCrafting, setIsCrafting] = useState(false);
  const iteminventory = useInventoryStore((state) => state.iteminventory);
  const loadUserInventory = useInventoryStore(
    (state) => state.loadUserInventory
  );
  const loadGroupedRecipes = useCraftStore((state) => state.loadGroupedRecipes);

  // Create a map of item id to quantity for quick lookup
  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>();
    iteminventory.forEach((userItem) => {
      map.set(userItem.item.id, userItem.quantity);
    });
    return map;
  }, [iteminventory]);

  // Check if user has enough resources for crafting
  const hasEnoughResources = useMemo(() => {
    return recipe.ingredients.every((ingredient: ICraftRecipeIngredient) => {
      const userQuantity = inventoryMap.get(ingredient.item.id) ?? 0;
      return userQuantity >= ingredient.requiredAmount;
    });
  }, [recipe.ingredients, inventoryMap]);

  const craftItemMutation = api.crafting.craftItem.useMutation({
    onSuccess: async () => {
      // Reload inventory and recipes after successful crafting
      if (address) {
        await loadUserInventory(address);
      }
      await loadGroupedRecipes('crafting');
      setIsCrafting(false);
      alert('Item crafted successfully!');
    },
    onError: (error) => {
      console.error('Crafting failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // Extract error message and missing ingredients from tRPC error structure
      const errorData = (error as any)?.data;
      const errorMessage =
        (error as unknown as Error).message ||
        errorData?.message ||
        (error as any)?.shape?.message ||
        'Failed to craft item';

      // Check if backend returned missing ingredients details
      const missingIngredients = errorData?.missingIngredients;

      let alertMessage = `Crafting failed: ${errorMessage}`;
      if (missingIngredients && Array.isArray(missingIngredients)) {
        alertMessage += '\n\nMissing ingredients according to backend:';
        missingIngredients.forEach((ing: any) => {
          alertMessage += `\n- ${ing.itemId}: need ${ing.required}, have ${ing.current}`;
        });
      }

      alert(alertMessage);
      setIsCrafting(false);
    },
  });

  const handleCraft = () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!hasEnoughResources) {
      // Log detailed info about missing resources
      console.log('Missing resources for crafting:');
      recipe.ingredients.forEach((ingredient: ICraftRecipeIngredient) => {
        const userQuantity = inventoryMap.get(ingredient.item.id) ?? 0;
        console.log(
          `- ${ingredient.item.title}: need ${ingredient.requiredAmount}, have ${userQuantity}`
        );
      });
      alert('Insufficient ingredients');
      return;
    }

    console.log('Attempting to craft:', {
      recipeId: recipe.id,
      userId: address,
      ingredients: recipe.ingredients.map((ing: ICraftRecipeIngredient) => ({
        itemId: ing.item.id,
        required: ing.requiredAmount,
        current: inventoryMap.get(ing.item.id) ?? 0,
      })),
    });

    console.log('Current inventory map (itemId -> quantity):');
    inventoryMap.forEach((quantity, itemId) => {
      console.log(`  ${itemId}: ${quantity}`);
    });

    setIsCrafting(true);
    craftItemMutation.mutate({
      userId: address,
      recipeId: recipe.id,
    });
  };

  return (
    <div className="flex w-full flex-row items-center gap-2 text-sm">
      <Image
        src={
          recipe.image
            ? recipe.image.startsWith('/')
              ? recipe.image
              : `/items/${recipe.image}`
            : '/icons/default-item.png'
        }
        alt={recipe.title}
        width={40}
        height={40}
        className="size-10 shrink-0 bg-gray-400"
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span className="font-pixel truncate font-bold">{recipe.title}</span>
        <div className="flex min-w-0 flex-row items-center gap-2">
          <div className="min-w-0 flex-1">
            <CraftRecipe
              ingredients={recipe.ingredients}
              userInventory={inventoryMap}
            />
          </div>
        </div>
      </div>
      <Button
        variant={hasEnoughResources ? 'green' : 'gray'}
        className={`${buttonClassName} shrink-0`}
        onClick={handleCraft}
        disabled={isCrafting || !hasEnoughResources || !address}
      >
        <span>{isCrafting ? 'Crafting...' : 'Craft'}</span>
      </Button>
    </div>
  );
}

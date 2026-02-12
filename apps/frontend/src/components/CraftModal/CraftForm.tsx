'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { CollapsePanel } from '../shared/CollapsePanel';
import { CraftFormBg } from './assets/craft-form-bg';
import { CraftFormItem } from './CraftFormItem';
import { Scroll } from '../shared/Scroll';
import { useCraftStore } from '@/lib/store/craftStore';
import type { ICraftRecipe } from '@/lib/types/Craft';

interface CraftFormProps {
  onCancel?: () => void;
  address?: string;
}

export function CraftForm({ onCancel, address }: CraftFormProps) {
  const { groupedPanels, isLoading, error, loadGroupedRecipes } =
    useCraftStore();

  useEffect(() => {
    // Load grouped recipes on mount (for crafting type)
    loadGroupedRecipes('crafting');
  }, [loadGroupedRecipes]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Background */}
      <CraftFormBg className="absolute inset-0 -top-5 z-0 h-full w-full" />

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col gap-5 pl-2 pt-2">
        {/* Scrollable Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <Scroll height="100%" className="w-full" alwaysShowScrollbar={true}>
            <div className="flex flex-shrink-0 flex-row items-center gap-2.5">
              <Image
                src="/icons/armor.png"
                width={32}
                height={28}
                alt="armor"
                className="h-7 w-8 object-contain object-center"
              />
              <span className="font-pixel text-main-gray text-lg font-bold">
                Armor
              </span>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <span className="text-main-gray">Loading recipes...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-4">
                <span className="text-red-500">{error}</span>
              </div>
            )}

            {!isLoading && !error && (
              <div className="flex flex-col gap-2.5">
                {groupedPanels.map((panel) => (
                  <CollapsePanel
                    key={panel.category}
                    title={
                      <span className="flex flex-row items-center gap-2.5">
                        <Image
                          src={panel.icon}
                          alt={panel.title}
                          width={32}
                          height={32}
                        />
                        {panel.title}
                      </span>
                    }
                  >
                    {panel.recipes && panel.recipes.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {panel.recipes.map((recipe: ICraftRecipe) => (
                          <CraftFormItem
                            key={recipe.id}
                            recipe={recipe}
                            address={address}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-row gap-2.5">
                        <div className="flex flex-col gap-1">No recipes</div>
                      </div>
                    )}
                  </CollapsePanel>
                ))}
              </div>
            )}
          </Scroll>
        </div>
      </div>
    </div>
  );
}

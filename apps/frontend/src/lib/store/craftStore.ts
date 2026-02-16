import { create } from 'zustand';
import type {
  ICraftRecipe,
  ICraftGroupPanel,
  CraftingType,
} from '@wizard-battle/common';
import { trpcClient } from '@/trpc/vanilla';

interface CraftStore {
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Data
  recipes: ICraftRecipe[];
  groupedPanels: ICraftGroupPanel[];

  // Filter state
  currentCraftingType: CraftingType | null;

  // Actions
  loadAllRecipes: () => Promise<void>;
  loadRecipesByType: (craftingType: CraftingType) => Promise<void>;
  loadGroupedRecipes: (craftingType?: CraftingType) => Promise<void>;
  setCurrentCraftingType: (craftingType: CraftingType | null) => void;
  clearRecipes: () => void;

  // Selectors
  getRecipesByCategory: (category: string) => ICraftRecipe[];
  getRecipeById: (id: string) => ICraftRecipe | undefined;
}

export const useCraftStore = create<CraftStore>()((set, get) => ({
  isLoading: false,
  error: null,
  recipes: [],
  groupedPanels: [],
  currentCraftingType: null,

  loadAllRecipes: async () => {
    set({ isLoading: true, error: null });

    try {
      const recipes = await trpcClient.crafting.getAllRecipes.query();

      set({
        recipes,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load craft recipes',
        isLoading: false,
      });
    }
  },

  loadRecipesByType: async (craftingType: CraftingType) => {
    set({ isLoading: true, error: null, currentCraftingType: craftingType });

    try {
      const recipes = await trpcClient.crafting.getRecipesByType.query({
        craftingType,
      });

      set({
        recipes,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load craft recipes',
        isLoading: false,
      });
    }
  },

  loadGroupedRecipes: async (craftingType?: CraftingType) => {
    set({ 
      isLoading: true, 
      error: null, 
      currentCraftingType: craftingType ?? null 
    });

    try {
      const groupedPanels = await trpcClient.crafting.getGroupedRecipes.query(
        craftingType ? { craftingType } : undefined
      );

      // Also extract all recipes from panels for easy access
      const recipes = groupedPanels.flatMap((panel) => panel.recipes);

      set({
        groupedPanels,
        recipes,
        isLoading: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load craft recipes',
        isLoading: false,
      });
    }
  },

  setCurrentCraftingType: (craftingType: CraftingType | null) => {
    set({ currentCraftingType: craftingType });
  },

  clearRecipes: () => {
    set({
      recipes: [],
      groupedPanels: [],
      currentCraftingType: null,
      error: null,
    });
  },

  getRecipesByCategory: (category: string): ICraftRecipe[] => {
    const state = get();
    return state.recipes.filter((recipe) => recipe.category === category);
  },

  getRecipeById: (id: string): ICraftRecipe | undefined => {
    const state = get();
    return state.recipes.find((recipe) => recipe.id === id);
  },
}));


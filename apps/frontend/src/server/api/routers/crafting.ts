import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';
import type {
  ICraftRecipe,
  ICraftRecipeDB,
  ICraftRecipeIngredient,
  ICraftGroupPanel,
  ICraftCategoryConfig,
  InventoryItemWearableArmorSlot,
  IInventoryItem,
} from '@wizard-battle/common';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const craftRecipesCollection = 'craftrecipes';
const itemsCollection = 'inventoryitems';

// Inlined category configs to avoid importing runtime values from common package
// (which would pull in o1js and break SSR)
const CRAFT_CATEGORY_CONFIGS: ICraftCategoryConfig[] = [
  { category: 'necklace', title: 'Necklace', icon: '/inventory/placeholders/necklace.png' },
  { category: 'ring', title: 'Rings', icon: '/inventory/placeholders/ring.png' },
  { category: 'belt', title: 'Belts', icon: '/inventory/placeholders/belt.png' },
  { category: 'arms', title: 'Gloves', icon: '/inventory/placeholders/arms.png' },
  { category: 'legs', title: 'Boots', icon: '/inventory/placeholders/legs.png' },
  { category: 'gem', title: 'Gems', icon: '/inventory/placeholders/gem.png' },
];

// Helper to populate recipe ingredients with item data
async function populateRecipeIngredients(
  ingredients: { itemId: string; requiredAmount: number }[]
): Promise<ICraftRecipeIngredient[]> {
  if (!db) return [];

  const itemIds = ingredients.map((i) => i.itemId);
  const items = await db
    .collection(itemsCollection)
    .find({ id: { $in: itemIds } })
    .toArray();

  return ingredients.map((ingredient) => {
    const item = items.find((i) => i.id === ingredient.itemId);
    return {
      item: (item as unknown as IInventoryItem) ?? {
        id: ingredient.itemId,
        title: 'Unknown Item',
        description: '',
        image: '',
        rarity: 'common',
        type: 'craft',
        amount: 0,
        price: 0,
      },
      requiredAmount: ingredient.requiredAmount,
    };
  });
}

// Helper to populate a single recipe
async function populateRecipe(recipe: ICraftRecipeDB): Promise<ICraftRecipe> {
  const populatedIngredients = await populateRecipeIngredients(recipe.ingredients);
  return {
    ...recipe,
    ingredients: populatedIngredients,
  };
}

export const craftingRouter = createTRPCRouter({
  // ==========================================
  // CRAFT RECIPES
  // ==========================================

  // Get all craft recipes (populated)
  getAllRecipes: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const recipes = (await db
      .collection(craftRecipesCollection)
      .find({})
      .toArray()) as unknown as ICraftRecipeDB[];

    const populatedRecipes = await Promise.all(
      recipes.map((recipe) => populateRecipe(recipe))
    );

    return populatedRecipes;
  }),

  // Get recipes by crafting type (crafting, upgrading, unifying)
  getRecipesByType: publicProcedure
    .input(z.object({ craftingType: z.enum(['crafting', 'upgrading', 'unifying']) }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const recipes = (await db
        .collection(craftRecipesCollection)
        .find({ craftingType: input.craftingType })
        .toArray()) as unknown as ICraftRecipeDB[];

      const populatedRecipes = await Promise.all(
        recipes.map((recipe) => populateRecipe(recipe))
      );

      return populatedRecipes;
    }),

  // Get recipes by category (necklace, ring, belt, etc.)
  getRecipesByCategory: publicProcedure
    .input(z.object({ 
      category: z.enum(['necklace', 'ring', 'belt', 'arms', 'legs', 'gem']) 
    }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const recipes = (await db
        .collection(craftRecipesCollection)
        .find({ category: input.category })
        .toArray()) as unknown as ICraftRecipeDB[];

      const populatedRecipes = await Promise.all(
        recipes.map((recipe) => populateRecipe(recipe))
      );

      return populatedRecipes;
    }),

  // Get recipes grouped by category (for CraftForm panels)
  getGroupedRecipes: publicProcedure
    .input(
      z.object({ 
        craftingType: z.enum(['crafting', 'upgrading', 'unifying']).optional() 
      }).optional()
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const filter = input?.craftingType 
        ? { craftingType: input.craftingType } 
        : {};

      const recipes = (await db
        .collection(craftRecipesCollection)
        .find(filter)
        .toArray()) as unknown as ICraftRecipeDB[];

      const populatedRecipes = await Promise.all(
        recipes.map((recipe) => populateRecipe(recipe))
      );

      // Group recipes by category
      const groupedPanels: ICraftGroupPanel[] = CRAFT_CATEGORY_CONFIGS.map((config) => ({
        category: config.category,
        title: config.title,
        icon: config.icon,
        recipes: populatedRecipes.filter((r) => r.category === config.category),
      }));

      return groupedPanels;
    }),

  // Get a single recipe by id
  getRecipe: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const recipe = (await db
        .collection(craftRecipesCollection)
        .findOne({ id: input.id })) as unknown as ICraftRecipeDB | null;

      if (!recipe) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Recipe with id "${input.id}" not found`,
        });
      }

      return populateRecipe(recipe);
    }),
});

export type CraftingRouter = typeof craftingRouter;


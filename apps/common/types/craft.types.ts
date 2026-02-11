// Shared crafting types for frontend and backend

import type { IInventoryItem, InventoryItemWearableArmorSlot } from './inventory.types';

export type CraftingType = 'crafting' | 'upgrading' | 'unifying';

// For database storage - stores item reference by ID
export interface ICraftRecipeIngredientDB {
  itemId: string;
  requiredAmount: number;
}

// For frontend display - includes full item object
export interface ICraftRecipeIngredient {
  item: IInventoryItem;
  requiredAmount: number;
}

// Database schema for craft recipe
export interface ICraftRecipeDB {
  id: string;
  title: string;
  description: string;
  image: string;
  craftingType: CraftingType;
  category: InventoryItemWearableArmorSlot;
  resultItemId: string; // Reference to the item that will be crafted
  ingredients: ICraftRecipeIngredientDB[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Frontend craft recipe (with populated ingredients)
export interface ICraftRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  craftingType: CraftingType;
  category: InventoryItemWearableArmorSlot;
  resultItemId: string;
  ingredients: ICraftRecipeIngredient[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Craft group panel (grouped by category)
export interface ICraftGroupPanel {
  category: InventoryItemWearableArmorSlot;
  title: string;
  icon: string;
  recipes: ICraftRecipe[];
}

// Input for creating a craft recipe
export interface ICreateCraftRecipeInput {
  title: string;
  description: string;
  image: string;
  craftingType: CraftingType;
  category: InventoryItemWearableArmorSlot;
  resultItemId: string;
  ingredients: ICraftRecipeIngredientDB[];
}

// Category display configuration
export interface ICraftCategoryConfig {
  category: InventoryItemWearableArmorSlot;
  title: string;
  icon: string;
}

// Default category configurations
export const CRAFT_CATEGORY_CONFIGS: ICraftCategoryConfig[] = [
  { category: 'necklace', title: 'Necklace', icon: '/inventory/placeholders/necklace.png' },
  { category: 'ring', title: 'Rings', icon: '/inventory/placeholders/ring.png' },
  { category: 'belt', title: 'Belts', icon: '/inventory/placeholders/belt.png' },
  { category: 'arms', title: 'Gloves', icon: '/inventory/placeholders/arms.png' },
  { category: 'legs', title: 'Boots', icon: '/inventory/placeholders/legs.png' },
  { category: 'gem', title: 'Gems', icon: '/inventory/placeholders/gem.png' },
];


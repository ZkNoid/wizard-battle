// Re-export craft types from shared common package
// NOTE: Only type exports to avoid pulling in o1js runtime dependencies
export type {
  CraftingType,
  ICraftRecipeIngredientDB,
  ICraftRecipeIngredient,
  ICraftRecipeDB,
  ICraftRecipe,
  ICraftGroupPanel,
  ICreateCraftRecipeInput,
  ICraftCategoryConfig,
} from '@wizard-battle/common';

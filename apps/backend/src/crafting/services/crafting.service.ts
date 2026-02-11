import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CraftRecipe,
  CraftRecipeDocument,
} from '../schemas/craft-recipe.schema';
import { UserInventoryService } from '../../user-inventory/services/user-inventory.service';
import { CraftItemDto } from '../dto/craft-item.dto';
import { UserInventory } from '../../user-inventory/schemas/user-inventory.schema';

@Injectable()
export class CraftingService {
  constructor(
    @InjectModel(CraftRecipe.name)
    private readonly recipeModel: Model<CraftRecipeDocument>,
    private readonly userInventoryService: UserInventoryService
  ) {}

  /**
   * Get all craft recipes
   */
  async getAllRecipes(): Promise<CraftRecipe[]> {
    return this.recipeModel.find().exec();
  }

  /**
   * Get a specific recipe by ID
   */
  async getRecipeById(recipeId: string): Promise<CraftRecipe> {
    const recipe = await this.recipeModel.findOne({ id: recipeId }).exec();

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }

    return recipe;
  }

  /**
   * Craft an item using a recipe
   * 1. Validate recipe exists
   * 2. Check user has all required ingredients
   * 3. Remove ingredients from inventory
   * 4. Add crafted item to inventory
   */
  async craftItem(dto: CraftItemDto): Promise<UserInventory> {
    const { userId, recipeId } = dto;

    // Step 1: Get the recipe
    const recipe = await this.getRecipeById(recipeId);

    // Step 2: Check if user has all required ingredients
    const hasAllIngredients = await this.userInventoryService.hasItems(
      userId,
      recipe.ingredients.map((ing) => ({
        itemId: ing.itemId,
        quantity: ing.requiredAmount,
      }))
    );

    if (!hasAllIngredients) {
      // Get details of missing ingredients for better error message
      const missingIngredients: Array<{
        itemId: string;
        required: number;
        current: number;
      }> = [];

      // Debug: Log recipe ingredients
      console.log(
        'Recipe ingredients:',
        recipe.ingredients.map((ing) => ({
          itemId: ing.itemId,
          itemIdType: typeof ing.itemId,
          requiredAmount: ing.requiredAmount,
        }))
      );

      for (const ingredient of recipe.ingredients) {
        console.log(
          `Checking ingredient: ${ingredient.itemId} (type: ${typeof ingredient.itemId})`
        );

        const hasItem = await this.userInventoryService.hasItem(
          userId,
          ingredient.itemId,
          ingredient.requiredAmount
        );

        console.log(`  hasItem result: ${hasItem}`);

        if (!hasItem) {
          const userItem = await this.userInventoryService
            .getUserInventoryItem(userId, ingredient.itemId)
            .catch((err) => {
              console.log(`  getUserInventoryItem failed: ${err.message}`);
              return null;
            });

          console.log(
            `  userItem found:`,
            userItem
              ? { itemId: userItem.itemId, quantity: userItem.quantity }
              : 'null'
          );

          missingIngredients.push({
            itemId: ingredient.itemId,
            required: ingredient.requiredAmount,
            current: userItem?.quantity || 0,
          });
        }
      }

      throw new BadRequestException({
        message: 'Insufficient ingredients for crafting',
        missingIngredients,
      });
    }

    // Step 3: Remove all required ingredients from inventory
    for (const ingredient of recipe.ingredients) {
      await this.userInventoryService.removeItem(
        userId,
        ingredient.itemId,
        ingredient.requiredAmount
      );
    }

    // Step 4: Add the crafted item to inventory
    const craftedItem = await this.userInventoryService.addItem({
      userId,
      itemId: recipe.resultItemId,
      quantity: 1,
      acquiredFrom: 'crafted',
    });

    return craftedItem;
  }

  /**
   * Get recipes by category
   */
  async getRecipesByCategory(category: string): Promise<CraftRecipe[]> {
    return this.recipeModel.find({ category }).exec();
  }

  /**
   * Get recipes by crafting type
   */
  async getRecipesByType(craftingType: string): Promise<CraftRecipe[]> {
    return this.recipeModel.find({ craftingType }).exec();
  }
}

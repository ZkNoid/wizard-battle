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
      // Get available recipes for developer debugging
      const availableRecipes = await this.recipeModel
        .find()
        .select('id title category')
        .limit(20)
        .exec();

      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: `Recipe with id "${recipeId}" not found`,
        details: {
          requestedRecipeId: recipeId,
          availableRecipesCount: availableRecipes.length,
          sampleRecipes: availableRecipes.map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
          })),
        },
        diagnostic: {
          timestamp: new Date().toISOString(),
          hint: 'Check if the recipeId is correct. Sample available recipes are listed above.',
        },
      });
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
      // Collect detailed diagnostic information for developers
      const diagnosticInfo: {
        userId: string;
        recipeId: string;
        recipeTitle: string;
        ingredients: {
          required: Array<{ itemId: string; required: number }>;
          userInventory: Array<{
            itemId: string;
            quantity: number;
            found: boolean;
            error?: string;
          }>;
          missing: Array<{
            itemId: string;
            required: number;
            current: number;
            shortage: number;
          }>;
        };
        debug: {
          timestamp: string;
          recipeIngredientTypes: Array<{
            itemId: string;
            itemIdType: string;
            requiredAmount: number;
          }>;
        };
      } = {
        userId,
        recipeId,
        recipeTitle: recipe.title || 'Unknown Recipe',
        ingredients: {
          required: [],
          userInventory: [],
          missing: [],
        },
        debug: {
          timestamp: new Date().toISOString(),
          recipeIngredientTypes: recipe.ingredients.map((ing) => ({
            itemId: ing.itemId,
            itemIdType: typeof ing.itemId,
            requiredAmount: ing.requiredAmount,
          })),
        },
      };

      // Check each ingredient and build detailed error info
      for (const ingredient of recipe.ingredients) {
        const requiredInfo = {
          itemId: ingredient.itemId,
          required: ingredient.requiredAmount,
        };
        diagnosticInfo.ingredients.required.push(requiredInfo);

        const hasItem = await this.userInventoryService.hasItem(
          userId,
          ingredient.itemId,
          ingredient.requiredAmount
        );

        if (!hasItem) {
          const userItem = await this.userInventoryService
            .getUserInventoryItem(userId, ingredient.itemId)
            .catch((err) => {
              // Include error details in diagnostic info
              diagnosticInfo.ingredients.userInventory.push({
                itemId: ingredient.itemId,
                quantity: 0,
                error: err.message,
                found: false,
              });
              return null;
            });

          const current = userItem?.quantity || 0;

          if (userItem) {
            diagnosticInfo.ingredients.userInventory.push({
              itemId: userItem.itemId,
              quantity: current,
              found: true,
            });
          }

          diagnosticInfo.ingredients.missing.push({
            itemId: ingredient.itemId,
            required: ingredient.requiredAmount,
            current,
            shortage: ingredient.requiredAmount - current,
          });
        } else {
          // Even if user has the item, include it in diagnostics
          const userItem = await this.userInventoryService
            .getUserInventoryItem(userId, ingredient.itemId)
            .catch(() => null);

          if (userItem) {
            diagnosticInfo.ingredients.userInventory.push({
              itemId: userItem.itemId,
              quantity: userItem.quantity,
              found: true,
            });
          }
        }
      }

      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Insufficient ingredients for crafting',
        details: {
          summary: `Missing ${diagnosticInfo.ingredients.missing.length} ingredient(s)`,
          missingIngredients: diagnosticInfo.ingredients.missing,
          userInventory: diagnosticInfo.ingredients.userInventory,
          requiredIngredients: diagnosticInfo.ingredients.required,
        },
        // Developer-friendly diagnostic info
        diagnostic: diagnosticInfo,
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

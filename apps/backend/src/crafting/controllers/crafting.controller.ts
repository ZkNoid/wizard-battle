import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { CraftingService } from '../services/crafting.service';
import { CraftItemDto } from '../dto/craft-item.dto';
import { UserInventory } from '../../user-inventory/schemas/user-inventory.schema';
import { CraftRecipe } from '../schemas/craft-recipe.schema';

@Controller('crafting')
export class CraftingController {
  constructor(private readonly craftingService: CraftingService) {}

  /**
   * Craft an item using a recipe
   * POST /crafting/craft
   */
  @Post('craft')
  async craftItem(@Body() dto: CraftItemDto): Promise<UserInventory> {
    return this.craftingService.craftItem(dto);
  }

  /**
   * Get all craft recipes
   * GET /crafting/recipes
   */
  @Get('recipes')
  async getAllRecipes(): Promise<CraftRecipe[]> {
    return this.craftingService.getAllRecipes();
  }

  /**
   * Get a specific recipe by ID
   * GET /crafting/recipes/:id
   */
  @Get('recipes/:id')
  async getRecipeById(@Param('id') id: string): Promise<CraftRecipe> {
    return this.craftingService.getRecipeById(id);
  }

  /**
   * Get recipes by category
   * GET /crafting/recipes/category/:category
   */
  @Get('recipes/category/:category')
  async getRecipesByCategory(
    @Param('category') category: string
  ): Promise<CraftRecipe[]> {
    return this.craftingService.getRecipesByCategory(category);
  }

  /**
   * Get recipes by crafting type
   * GET /crafting/recipes/type/:type
   */
  @Get('recipes/type/:type')
  async getRecipesByType(@Param('type') type: string): Promise<CraftRecipe[]> {
    return this.craftingService.getRecipesByType(type);
  }
}

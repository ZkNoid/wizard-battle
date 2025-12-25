// src/game-items/controllers/recipe.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RecipeService } from '../services/game-item-recipe.service';
import { CreateRecipeDto } from '../dto/create-game-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-game-recipe.dto';
import { GameItemRecipe } from '../schemas/game-item-recipe.schema';

@Controller('game-item-recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  create(@Body() createDto: CreateRecipeDto): Promise<GameItemRecipe> {
    return this.recipeService.create(createDto);
  }

  @Get()
  findAll(): Promise<GameItemRecipe[]> {
    return this.recipeService.findAll();
  }

  // Bonus: convenient endpoint to get recipe for a specific item
  @Get('by-item/:itemId')
  findByResultItem(@Param('itemId') itemId: string): Promise<GameItemRecipe> {
    return this.recipeService.findById(itemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<GameItemRecipe> {
    return this.recipeService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRecipeDto,
  ): Promise<GameItemRecipe> {
    return this.recipeService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<GameItemRecipe> {
    return this.recipeService.delete(id);
  }
}
// src/game-items/services/recipe.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameItemRecipe, GameItemRecipeDocument } from '../schemas/game-item-recipe.schema';
import { CreateRecipeDto } from '../dto/create-game-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-game-recipe.dto';

@Injectable()
export class RecipeService {
  constructor(
    @InjectModel(GameItemRecipe.name)
    private recipeModel: Model<GameItemRecipeDocument>,
  ) {}

  // Add these methods to your existing GameItemService or create a separate RecipeService if preferred

async create(createDto: CreateRecipeDto): Promise<GameItemRecipe> {
  const createdRecipe = new this.recipeModel(createDto);
  return createdRecipe.save();
}

async findAll(): Promise<GameItemRecipe[]> {
  return this.recipeModel.find().populate([
    { path: 'resultItem' },
    { path: 'classRecipes.uniqueResource' },
    { path: 'classRecipes.specificResource' },
    { path: 'classRecipes.commonResource' },
  ]).exec();
}

async findById(id: string): Promise<GameItemRecipe> {
  const recipe = await this.recipeModel.findById(id).populate([
    { path: 'resultItem' },
    { path: 'classRecipes.uniqueResource' },
    { path: 'classRecipes.specificResource' },
    { path: 'classRecipes.commonResource' },
  ]).exec();

  if (!recipe) {
    throw new NotFoundException(`Recipe with ID "${id}" not found`);
  }
  return recipe;
}

async findByResultItem(itemId: string): Promise<GameItemRecipe | null> {
  return this.recipeModel.findOne({ resultItem: itemId }).populate([
    { path: 'resultItem' },
    { path: 'classRecipes.uniqueResource' },
    { path: 'classRecipes.specificResource' },
    { path: 'classRecipes.commonResource' },
  ]).exec();
}

async update(id: string, updateDto: UpdateRecipeDto): Promise<GameItemRecipe> {
  const updated = await this.recipeModel.findByIdAndUpdate(id, updateDto, { new: true })
    .populate([
      { path: 'resultItem' },
      { path: 'classRecipes.uniqueResource' },
      { path: 'classRecipes.specificResource' },
      { path: 'classRecipes.commonResource' },
    ]).exec();

  if (!updated) {
    throw new NotFoundException(`Recipe with ID "${id}" not found`);
  }
  return updated;
}

async delete(id: string): Promise<GameItemRecipe> {
  const deleted = await this.recipeModel.findByIdAndDelete(id).exec();
  if (!deleted) {
    throw new NotFoundException(`Recipe with ID "${id}" not found`);
  }
  return deleted;
}
}
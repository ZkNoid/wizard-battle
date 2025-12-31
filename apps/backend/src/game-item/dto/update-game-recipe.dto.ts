// src/game-items/dto/update-recipe.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateRecipeDto } from './create-game-recipe.dto';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {}
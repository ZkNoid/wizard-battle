// src/game-items/dto/create-recipe.dto.ts

import { IsMongoId, IsNotEmpty, IsString, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RecipeLevelDto {
  @IsNotEmpty()
  level!: number;

  @IsNotEmpty()
  uniqueQty!: number;

  @IsNotEmpty()
  specificQty!: number;

  @IsNotEmpty()
  commonQty!: number;
}

class ClassRecipeDto {
  @IsString()
  @IsNotEmpty()
  className!: string;

  @IsMongoId()
  uniqueResource!: string;

  @IsMongoId()
  specificResource!: string;

  @IsMongoId()
  commonResource!: string;

  @ValidateNested({ each: true })
  @Type(() => RecipeLevelDto)
  @ArrayMinSize(6)
  levels!: RecipeLevelDto[];
}

export class CreateRecipeDto {
  @IsMongoId()
  resultItem!: string;

  @ValidateNested({ each: true })
  @Type(() => ClassRecipeDto)
  @ArrayMinSize(1)
  classRecipes!: ClassRecipeDto[];
}
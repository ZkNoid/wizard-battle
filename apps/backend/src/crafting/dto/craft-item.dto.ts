import { IsNotEmpty, IsString } from 'class-validator';

export class CraftItemDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsNotEmpty()
  @IsString()
  recipeId!: string;
}

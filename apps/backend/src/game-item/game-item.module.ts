import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameItem, GameItemSchema } from './schemas/game-item.schema';
import { GameItemService } from './services/game-item.service';
import { GameItemRecipe, GameItemRecipeSchema } from './schemas/game-item-recipe.schema';
import { RecipeService } from './services/game-item-recipe.service';
import { GameItemDrop, GameItemDropSchema } from './schemas/game-item-drop.schema';
import { DropService } from './services/game-item-drop.service';
import { GameItemController } from './game-item.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameItem.name, schema: GameItemSchema },
      { name: GameItemRecipe.name, schema: GameItemRecipeSchema },
      { name: GameItemDrop.name, schema: GameItemDropSchema },
    ]),
  ],
  controllers: [GameItemController],
  providers: [GameItemService, RecipeService, DropService],
  exports: [GameItemService, RecipeService, DropService],
})
export class GameItemModule {}
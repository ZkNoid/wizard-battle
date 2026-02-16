import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameItem, GameItemSchema } from './schemas/game-item.schema';
import { GameItemService } from './services/game-item.service';
import {
  GameItemRecipe,
  GameItemRecipeSchema,
} from './schemas/game-item-recipe.schema';
import { RecipeService } from './services/game-item-recipe.service';
import {
  GameItemDrop,
  GameItemDropSchema,
} from './schemas/game-item-drop.schema';
import { DropService } from './services/game-item-drop.service';
import {
  InventoryItem,
  iteminventorychema,
} from './schemas/inventory-item.schema';
import { iteminventoryervice } from './services/inventory-item.service';
import { GameItemController } from './game-item.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameItem.name, schema: GameItemSchema },
      { name: GameItemRecipe.name, schema: GameItemRecipeSchema },
      { name: GameItemDrop.name, schema: GameItemDropSchema },
      { name: InventoryItem.name, schema: iteminventorychema },
    ]),
  ],
  controllers: [GameItemController],
  providers: [GameItemService, RecipeService, DropService, iteminventoryervice],
  exports: [GameItemService, RecipeService, DropService, iteminventoryervice],
})
export class GameItemModule {}

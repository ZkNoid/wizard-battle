import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CraftingService } from './services/crafting.service';
import { CraftingController } from './controllers/crafting.controller';
import { CraftRecipe, CraftRecipeSchema } from './schemas/craft-recipe.schema';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';
import { QuestsModule } from '../quests/quests.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CraftRecipe.name, schema: CraftRecipeSchema },
    ]),
    UserInventoryModule, // Import to access UserInventoryService
    QuestsModule, // Import for quest tracking
  ],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}

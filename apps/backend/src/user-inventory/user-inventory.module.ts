import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserInventory, UserInventorySchema } from './schemas/user-inventory.schema';
import { UserInventoryService } from './services/user-inventory.service';
import { UserInventoryController } from './controllers/user-inventory.controller';
import { GameItemModule } from '../game-item/game-item.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserInventory.name, schema: UserInventorySchema },
    ]),
    GameItemModule, // Import to access GameItem schema for population
  ],
  controllers: [UserInventoryController],
  providers: [UserInventoryService],
  exports: [UserInventoryService], // Export service for use in other modules (e.g., crafting)
})
export class UserInventoryModule {}

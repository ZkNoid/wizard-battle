import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expedition, ExpeditionSchema } from './schemas/expedition.schema';
import { ExpeditionService } from './services/expedition.service';
import { ExpeditionController } from './controllers/expedition.controller';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expedition.name, schema: ExpeditionSchema },
    ]),
    UserInventoryModule, // Import to access inventory service for adding loot
  ],
  controllers: [ExpeditionController],
  providers: [ExpeditionService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}

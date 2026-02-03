import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expedition, ExpeditionSchema } from './schemas/expedition.schema';
import { Location, LocationSchema } from './schemas/location.schema';
import { ExpeditionService } from './services/expedition.service';
import { LocationService } from './services/location.service';
import { ExpeditionController } from './controllers/expedition.controller';
import { LocationController } from './controllers/location.controller';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expedition.name, schema: ExpeditionSchema },
      { name: Location.name, schema: LocationSchema },
    ]),
    UserInventoryModule, // Import to access UserInventoryService for adding rewards
  ],
  controllers: [ExpeditionController, LocationController],
  providers: [ExpeditionService, LocationService],
  exports: [ExpeditionService, LocationService],
})
export class ExpeditionModule {}


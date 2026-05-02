import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftController } from './nft.controller';
import { NftService } from './nft.service';
import {
  InventoryItem,
  iteminventorychema,
} from '../game-item/schemas/inventory-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryItem.name, schema: iteminventorychema },
    ]),
  ],
  controllers: [NftController],
  providers: [NftService],
})
export class NftModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketOrder, MarketOrderSchema } from './schemas/market-order.schema';
import {
  FulfilledOrderTx,
  FulfilledOrderTxSchema,
} from './schemas/fulfilled-order-tx.schema';
import { MarketService } from './services/market.service';
import { MarketController } from './controllers/market.controller';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketOrder.name, schema: MarketOrderSchema },
      { name: FulfilledOrderTx.name, schema: FulfilledOrderTxSchema },
    ]),
    UserInventoryModule,
    UserModule,
  ],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}

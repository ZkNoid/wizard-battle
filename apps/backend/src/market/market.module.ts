import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketOrder, MarketOrderSchema } from './schemas/market-order.schema';
import { MarketService } from './services/market.service';
import { MarketController } from './controllers/market.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketOrder.name, schema: MarketOrderSchema },
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}

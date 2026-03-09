import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketOrder, MarketOrderSchema } from './schemas/market-order.schema';
import { IndexerState, IndexerStateSchema } from './schemas/indexer-state.schema';
import { MarketIndexerService } from './services/market-indexer.service';
import { MarketService } from './services/market.service';
import { MarketController } from './controllers/market.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketOrder.name, schema: MarketOrderSchema },
      { name: IndexerState.name, schema: IndexerStateSchema },
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketIndexerService, MarketService],
  exports: [MarketService, MarketIndexerService],
})
export class MarketModule {}

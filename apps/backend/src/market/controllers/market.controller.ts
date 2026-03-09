import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MarketService } from '../services/market.service';
import { MarketIndexerService } from '../services/market-indexer.service';
import { GetOrdersDto } from '../dto/get-orders.dto';
import { MarketOrder, OrderStatus } from '../schemas/market-order.schema';

@Controller('market')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly indexerService: MarketIndexerService,
  ) {}

  /**
   * Get all open orders with optional filters
   * GET /market/orders
   */
  @Get('orders')
  getOpenOrders(@Query() query: GetOrdersDto): Promise<MarketOrder[]> {
    return this.marketService.getOpenOrders(query);
  }

  /**
   * Get all orders with any status
   * GET /market/orders/all
   */
  @Get('orders/all')
  getAllOrders(@Query() query: GetOrdersDto): Promise<MarketOrder[]> {
    return this.marketService.getOrders(query);
  }

  /**
   * Get order by ID
   * GET /market/orders/:orderId
   */
  @Get('orders/:orderId')
  getOrder(@Param('orderId', ParseIntPipe) orderId: number): Promise<MarketOrder> {
    return this.marketService.getOrderById(orderId);
  }

  /**
   * Get user's active sell orders (OPEN + PAUSED)
   * GET /market/user/:address/selling
   */
  @Get('user/:address/selling')
  getUserActiveOrders(@Param('address') address: string): Promise<MarketOrder[]> {
    return this.marketService.getUserActiveOrders(address);
  }

  /**
   * Get all orders created by a user
   * GET /market/user/:address/orders
   */
  @Get('user/:address/orders')
  getUserOrders(
    @Param('address') address: string,
    @Query('status') status?: OrderStatus,
  ): Promise<MarketOrder[]> {
    return this.marketService.getUserOrders(address, status);
  }

  /**
   * Get user's trading history (orders they bought or sold)
   * GET /market/user/:address/history
   */
  @Get('user/:address/history')
  getUserHistory(@Param('address') address: string): Promise<MarketOrder[]> {
    return this.marketService.getUserHistory(address);
  }

  /**
   * Get orders user has purchased
   * GET /market/user/:address/purchases
   */
  @Get('user/:address/purchases')
  getUserPurchases(@Param('address') address: string): Promise<MarketOrder[]> {
    return this.marketService.getUserPurchases(address);
  }

  /**
   * Get orders user has sold
   * GET /market/user/:address/sales
   */
  @Get('user/:address/sales')
  getUserSales(@Param('address') address: string): Promise<MarketOrder[]> {
    return this.marketService.getUserSales(address);
  }

  /**
   * Get orders by item nameHash
   * GET /market/items/:nameHash
   */
  @Get('items/:nameHash')
  getOrdersByNameHash(
    @Param('nameHash') nameHash: string,
    @Query('status') status?: OrderStatus,
  ): Promise<MarketOrder[]> {
    return this.marketService.getOrdersByNameHash(nameHash, status);
  }

  /**
   * Get floor price for an item
   * GET /market/items/:nameHash/floor
   */
  @Get('items/:nameHash/floor')
  async getFloorPrice(
    @Param('nameHash') nameHash: string,
  ): Promise<{ floorPrice: string | null }> {
    const floorPrice = await this.marketService.getFloorPrice(nameHash);
    return { floorPrice };
  }

  /**
   * Get market statistics
   * GET /market/stats
   */
  @Get('stats')
  getOrderStats(): Promise<{
    totalOrders: number;
    openOrders: number;
    filledOrders: number;
    canceledOrders: number;
  }> {
    return this.marketService.getOrderStats();
  }

  /**
   * Get indexer status
   * GET /market/indexer/status
   */
  @Get('indexer/status')
  async getIndexerStatus() {
    const status = this.indexerService.getStatus();
    const state = await this.indexerService.getIndexerState();

    return {
      ...status,
      lastProcessedBlock: state?.lastProcessedBlock,
      isFullySynced: state?.isFullySynced,
      totalOrdersIndexed: state?.totalOrdersIndexed,
      lastUpdated: state?.lastUpdated,
    };
  }
}

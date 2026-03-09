import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MarketOrder,
  MarketOrderDocument,
  OrderStatus,
} from '../schemas/market-order.schema';
import { GetOrdersDto } from '../dto/get-orders.dto';

@Injectable()
export class MarketService {
  constructor(
    @InjectModel(MarketOrder.name)
    private readonly orderModel: Model<MarketOrderDocument>,
  ) {}

  async getOrders(filters: GetOrdersDto = {}): Promise<MarketOrder[]> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.paymentToken) {
      query.paymentToken = filters.paymentToken.toLowerCase();
    }

    if (filters.nameHash) {
      query.nameHash = filters.nameHash;
    }

    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        query.price.$lte = filters.maxPrice;
      }
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;

    return this.orderModel
      .find(query)
      .sort({ [sortField]: sortDirection } as any)
      .skip(filters.offset || 0)
      .limit(filters.limit || 50)
      .exec();
  }

  async getOpenOrders(
    filters: Omit<GetOrdersDto, 'status'> = {},
  ): Promise<MarketOrder[]> {
    return this.getOrders({ ...filters, status: OrderStatus.OPEN });
  }

  async getOrderById(orderId: number): Promise<MarketOrder> {
    const order = await this.orderModel.findOne({ orderId }).exec();

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    return order;
  }

  async getUserOrders(
    userAddress: string,
    status?: OrderStatus,
  ): Promise<MarketOrder[]> {
    const query: any = {
      maker: userAddress.toLowerCase(),
    };

    if (status) {
      query.status = status;
    }

    return this.orderModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getUserActiveOrders(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        maker: userAddress.toLowerCase(),
        status: { $in: [OrderStatus.OPEN, OrderStatus.PAUSED] },
      } as any)
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUserHistory(userAddress: string): Promise<MarketOrder[]> {
    const address = userAddress.toLowerCase();

    return this.orderModel
      .find({
        $or: [{ maker: address }, { taker: address }],
        status: OrderStatus.FILLED,
      } as any)
      .sort({ filledAt: -1 })
      .exec();
  }

  async getUserPurchases(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        taker: userAddress.toLowerCase(),
        status: OrderStatus.FILLED,
      })
      .sort({ filledAt: -1 })
      .exec();
  }

  async getUserSales(userAddress: string): Promise<MarketOrder[]> {
    return this.orderModel
      .find({
        maker: userAddress.toLowerCase(),
        status: OrderStatus.FILLED,
      })
      .sort({ filledAt: -1 })
      .exec();
  }

  async getOrdersByNameHash(
    nameHash: string,
    status?: OrderStatus,
  ): Promise<MarketOrder[]> {
    const query: any = { nameHash };

    if (status) {
      query.status = status;
    }

    return this.orderModel.find(query).sort({ price: 1 }).exec();
  }

  async getOrderStats(): Promise<{
    totalOrders: number;
    openOrders: number;
    filledOrders: number;
    canceledOrders: number;
  }> {
    const [totalOrders, openOrders, filledOrders, canceledOrders] =
      await Promise.all([
        this.orderModel.countDocuments(),
        this.orderModel.countDocuments({ status: OrderStatus.OPEN }),
        this.orderModel.countDocuments({ status: OrderStatus.FILLED }),
        this.orderModel.countDocuments({ status: OrderStatus.CANCELED }),
      ]);

    return {
      totalOrders,
      openOrders,
      filledOrders,
      canceledOrders,
    };
  }

  async getFloorPrice(nameHash: string): Promise<string | null> {
    const order = await this.orderModel
      .findOne({
        nameHash,
        status: OrderStatus.OPEN,
      })
      .sort({ price: 1 })
      .exec();

    return order?.price || null;
  }

  async searchOrders(params: {
    nameHashes?: string[];
    paymentTokens?: string[];
    status?: OrderStatus;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: 'price' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<MarketOrder[]> {
    const query: any = {};

    if (params.nameHashes?.length) {
      query.nameHash = { $in: params.nameHashes };
    }

    if (params.paymentTokens?.length) {
      query.paymentToken = {
        $in: params.paymentTokens.map((t) => t.toLowerCase()),
      };
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.minPrice || params.maxPrice) {
      query.price = {};
      if (params.minPrice) query.price.$gte = params.minPrice;
      if (params.maxPrice) query.price.$lte = params.maxPrice;
    }

    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;

    return this.orderModel
      .find(query)
      .sort({ [sortField]: sortDirection } as any)
      .skip(params.offset || 0)
      .limit(params.limit || 50)
      .exec();
  }
}

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';
import clientPromise from '@/server/db';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);
const marketOrdersCollection = 'marketorders';

const OrderStatusEnum = z.enum([
  'NONE',
  'OPEN',
  'PAUSED',
  'FILLED',
  'CANCELED',
]);

const MarketOrderSchema = z.object({
  orderId: z.number(),
  maker: z.string(),
  taker: z.string().optional(),
  token: z.string(),
  tokenId: z.string(),
  paymentToken: z.string(),
  paymentTokenId: z.string().optional(),
  amount: z.string(),
  price: z.string(),
  status: OrderStatusEnum,
  nameHash: z.string(),
  blockNumber: z.number(),
  transactionHash: z.string(),
  createdAt: z.string().optional(),
  filledAt: z.string().optional(),
  canceledAt: z.string().optional(),
  image: z.string().optional(),
  title: z.string().optional(),
});

export type MarketOrder = z.infer<typeof MarketOrderSchema>;

async function fetchFromBackend<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const backendUrl = env.BACKEND_URL || 'http://localhost:3030';

  const response = await fetch(`${backendUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        (errorData as { message?: string }).message ||
        `Request failed: ${response.status}`,
    });
  }

  return response.json();
}

export const marketRouter = createTRPCRouter({
  createOrder: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        maker: z.string(),
        token: z.string(),
        tokenId: z.string(),
        paymentToken: z.string(),
        paymentTokenId: z.string().default('0'),
        amount: z.string(),
        price: z.string(),
        nameHash: z.string(),
        blockNumber: z.number(),
        transactionHash: z.string(),
        image: z.string().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const collection = db.collection(marketOrdersCollection);

      const doc = {
        ...input,
        maker: input.maker.toLowerCase(),
        token: input.token.toLowerCase(),
        paymentToken: input.paymentToken.toLowerCase(),
        status: 'OPEN' as const,
        createdAt: new Date(),
      };

      const existing = await collection.findOne({ orderId: input.orderId });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Order #${input.orderId} already exists`,
        });
      }

      await collection.insertOne(doc);

      return doc;
    }),

  getOpenOrders: publicProcedure
    .input(
      z
        .object({
          paymentToken: z.string().optional(),
          nameHash: z.string().optional(),
          minPrice: z.string().optional(),
          maxPrice: z.string().optional(),
          sortBy: z.enum(['price', 'createdAt', 'orderId']).optional(),
          sortOrder: z.enum(['asc', 'desc']).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const params = new URLSearchParams();
      if (input?.paymentToken) params.set('paymentToken', input.paymentToken);
      if (input?.nameHash) params.set('nameHash', input.nameHash);
      if (input?.minPrice) params.set('minPrice', input.minPrice);
      if (input?.maxPrice) params.set('maxPrice', input.maxPrice);
      if (input?.sortBy) params.set('sortBy', input.sortBy);
      if (input?.sortOrder) params.set('sortOrder', input.sortOrder);
      if (input?.limit) params.set('limit', input.limit.toString());
      if (input?.offset) params.set('offset', input.offset.toString());

      const query = params.toString() ? `?${params.toString()}` : '';
      return fetchFromBackend<MarketOrder[]>(`/market/orders${query}`);
    }),

  getOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return fetchFromBackend<MarketOrder>(`/market/orders/${input.orderId}`);
    }),

  getUserSellingOrders: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return fetchFromBackend<MarketOrder[]>(
        `/market/user/${input.address}/selling`
      );
    }),

  getUserOrders: publicProcedure
    .input(
      z.object({
        address: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const query = input.status ? `?status=${input.status}` : '';
      return fetchFromBackend<MarketOrder[]>(
        `/market/user/${input.address}/orders${query}`
      );
    }),

  getUserHistory: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return fetchFromBackend<MarketOrder[]>(
        `/market/user/${input.address}/history`
      );
    }),

  getUserPurchases: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return fetchFromBackend<MarketOrder[]>(
        `/market/user/${input.address}/purchases`
      );
    }),

  getUserSales: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return fetchFromBackend<MarketOrder[]>(
        `/market/user/${input.address}/sales`
      );
    }),

  getOrdersByItem: publicProcedure
    .input(
      z.object({
        nameHash: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const query = input.status ? `?status=${input.status}` : '';
      return fetchFromBackend<MarketOrder[]>(
        `/market/items/${input.nameHash}${query}`
      );
    }),

  getFloorPrice: publicProcedure
    .input(z.object({ nameHash: z.string() }))
    .query(async ({ input }) => {
      return fetchFromBackend<{ floorPrice: string | null }>(
        `/market/items/${input.nameHash}/floor`
      );
    }),

  getStats: publicProcedure.query(async () => {
    return fetchFromBackend<{
      totalOrders: number;
      openOrders: number;
      filledOrders: number;
      canceledOrders: number;
    }>('/market/stats');
  }),

  getIndexerStatus: publicProcedure.query(async () => {
    return fetchFromBackend<{
      isRunning: boolean;
      reconnectAttempts: number;
      contractAddress: string;
      lastProcessedBlock?: number;
      isFullySynced?: boolean;
      totalOrdersIndexed?: number;
      lastUpdated?: string;
    }>('/market/indexer/status');
  }),
});

export type MarketRouter = typeof marketRouter;

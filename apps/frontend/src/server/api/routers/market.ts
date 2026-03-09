import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';

const OrderStatusEnum = z.enum(['NONE', 'OPEN', 'PAUSED', 'FILLED', 'CANCELED']);

const MarketOrderSchema = z.object({
  orderId: z.number(),
  maker: z.string(),
  taker: z.string().optional(),
  token: z.string(),
  tokenId: z.string(),
  paymentToken: z.string(),
  amount: z.string(),
  price: z.string(),
  status: OrderStatusEnum,
  nameHash: z.string(),
  blockNumber: z.number(),
  transactionHash: z.string(),
  createdAt: z.string().optional(),
  filledAt: z.string().optional(),
  canceledAt: z.string().optional(),
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

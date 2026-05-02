import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';
import { envioQuery } from '@/server/lib/envio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus = 'OPEN' | 'PAUSED' | 'FILLED' | 'CANCELED';

export interface MarketOrder {
  id: string;
  orderId: string;
  maker: string;
  taker: string | null;
  token: string;
  tokenId: string;
  paymentToken: string;
  paymentTokenId: string;
  amount: string;
  price: string;
  status: OrderStatus;
  nameHash: string;
  createdAtBlock: string;
  createdAtTimestamp: string;
  updatedAtBlock: string;
  updatedAtTimestamp: string;
  // Enriched from backend NftService
  image?: string;
  title?: string;
}

interface EnvioOrder {
  id: string;
  orderId: string;
  maker: string;
  taker: string | null;
  token: string;
  tokenId: string;
  paymentToken: string;
  paymentTokenId: string;
  amount: string;
  price: string;
  status: OrderStatus;
  nameHash: string;
  createdAtBlock: string;
  createdAtTimestamp: string;
  updatedAtBlock: string;
  updatedAtTimestamp: string;
}

const ORDER_FIELDS = `
  id
  orderId
  maker
  taker
  token
  tokenId
  paymentToken
  paymentTokenId
  amount
  price
  status
  nameHash
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
`;

// ---------------------------------------------------------------------------
// Metadata enrichment
// ---------------------------------------------------------------------------

interface NftMeta {
  name: string;
  image: string;
}

async function fetchOrderMetadata(tokenId: string): Promise<NftMeta | null> {
  try {
    const res = await fetch(`${env.BACKEND_URL}/nft/${tokenId}`);
    if (!res.ok) return null;
    return (await res.json()) as NftMeta;
  } catch {
    return null;
  }
}

async function enrichOrders(orders: EnvioOrder[]): Promise<MarketOrder[]> {
  const uniqueTokenIds = [...new Set(orders.map((o) => o.tokenId))];
  const metaMap = new Map<string, NftMeta | null>();

  await Promise.all(
    uniqueTokenIds.map(async (tokenId) => {
      metaMap.set(tokenId, await fetchOrderMetadata(tokenId));
    })
  );

  return orders.map((o) => {
    const meta = metaMap.get(o.tokenId);
    return {
      ...o,
      image: meta?.image,
      title: meta?.name,
    };
  });
}

// ---------------------------------------------------------------------------
// Zod helpers
// ---------------------------------------------------------------------------

const OrderStatusEnum = z.enum(['OPEN', 'PAUSED', 'FILLED', 'CANCELED']);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const marketRouter = createTRPCRouter({
  getOpenOrders: publicProcedure
    .input(
      z
        .object({
          paymentToken: z.string().optional(),
          nameHash: z.string().optional(),
          minPrice: z.string().optional(),
          maxPrice: z.string().optional(),
          sortBy: z.enum(['price', 'createdAtTimestamp', 'orderId']).optional(),
          sortOrder: z.enum(['asc', 'desc']).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const sortField = input?.sortBy ?? 'createdAtTimestamp';
      const sortDir = input?.sortOrder === 'asc' ? 'asc' : 'desc';

      const where: string[] = ['status: { _eq: "OPEN" }'];
      if (input?.paymentToken)
        where.push(`paymentToken: { _ilike: "${input.paymentToken}" }`);
      if (input?.nameHash)
        where.push(`nameHash: { _eq: "${input.nameHash}" }`);
      if (input?.minPrice)
        where.push(`price: { _gte: "${input.minPrice}" }`);
      if (input?.maxPrice)
        where.push(`price: { _lte: "${input.maxPrice}" }`);

      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: { ${where.join(', ')} }
            order_by: { ${sortField}: ${sortDir} }
            limit: ${input?.limit ?? 50}
            offset: ${input?.offset ?? 0}
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getOrder: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(where: { orderId: { _eq: "${input.orderId}" } }, limit: 1) {
            ${ORDER_FIELDS}
          }
        }
      `);

      const order = data.Order[0];
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order #${input.orderId} not found`,
        });
      }

      const [enriched] = await enrichOrders([order]);
      return enriched!;
    }),

  getUserSellingOrders: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              maker: { _ilike: "${input.address}" }
              status: { _in: ["OPEN", "PAUSED"] }
            }
            order_by: { createdAtTimestamp: desc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getUserOrders: publicProcedure
    .input(
      z.object({
        address: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const statusClause = input.status
        ? `status: { _eq: "${input.status}" }`
        : '';

      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              maker: { _ilike: "${input.address}" }
              ${statusClause}
            }
            order_by: { createdAtTimestamp: desc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getUserHistory: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const addr = input.address.toLowerCase();

      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              status: { _eq: "FILLED" }
              _or: [
                { maker: { _ilike: "${addr}" } }
                { taker: { _ilike: "${addr}" } }
              ]
            }
            order_by: { updatedAtTimestamp: desc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getUserPurchases: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              taker: { _ilike: "${input.address}" }
              status: { _eq: "FILLED" }
            }
            order_by: { updatedAtTimestamp: desc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getUserSales: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              maker: { _ilike: "${input.address}" }
              status: { _eq: "FILLED" }
            }
            order_by: { updatedAtTimestamp: desc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getOrdersByItem: publicProcedure
    .input(
      z.object({
        nameHash: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const statusClause = input.status
        ? `status: { _eq: "${input.status}" }`
        : '';

      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              nameHash: { _eq: "${input.nameHash}" }
              ${statusClause}
            }
            order_by: { price: asc }
          ) { ${ORDER_FIELDS} }
        }
      `);

      return enrichOrders(data.Order);
    }),

  getFloorPrice: publicProcedure
    .input(z.object({ nameHash: z.string() }))
    .query(async ({ input }) => {
      const data = await envioQuery<{ Order: EnvioOrder[] }>(`
        query {
          Order(
            where: {
              nameHash: { _eq: "${input.nameHash}" }
              status: { _eq: "OPEN" }
            }
            order_by: { price: asc }
            limit: 1
          ) { price }
        }
      `);

      return { floorPrice: data.Order[0]?.price ?? null };
    }),

  getStats: publicProcedure.query(async () => {
    const data = await envioQuery<{
      MarketplaceStats: {
        totalOrders: string;
        openOrders: string;
        pausedOrders: string;
        filledOrders: string;
        canceledOrders: string;
      }[];
    }>(`
      query {
        MarketplaceStats(where: { id: { _eq: "global" } }, limit: 1) {
          totalOrders
          openOrders
          pausedOrders
          filledOrders
          canceledOrders
        }
      }
    `);

    const stats = data.MarketplaceStats[0];
    if (!stats) {
      return {
        totalOrders: 0,
        openOrders: 0,
        pausedOrders: 0,
        filledOrders: 0,
        canceledOrders: 0,
      };
    }

    return {
      totalOrders: Number(stats.totalOrders),
      openOrders: Number(stats.openOrders),
      pausedOrders: Number(stats.pausedOrders),
      filledOrders: Number(stats.filledOrders),
      canceledOrders: Number(stats.canceledOrders),
    };
  }),

  getIndexerStatus: publicProcedure.query(async () => {
    const data = await envioQuery<{ Order: { updatedAtBlock: string; updatedAtTimestamp: string }[] }>(`
      query {
        Order(order_by: { updatedAtBlock: desc }, limit: 1) {
          updatedAtBlock
          updatedAtTimestamp
        }
      }
    `);

    const latest = data.Order[0];
    return {
      lastProcessedBlock: latest ? Number(latest.updatedAtBlock) : undefined,
      lastUpdated: latest
        ? new Date(Number(latest.updatedAtTimestamp) * 1000).toISOString()
        : undefined,
    };
  }),
});

export type MarketRouter = typeof marketRouter;

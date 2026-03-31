import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';
import clientPromise from '@/server/db';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);
const marketOrdersCollection = 'marketorders';

interface EvmTransactionReceipt {
  status: string; // "0x1" success, "0x0" revert
  to: string | null;
  from: string;
  blockNumber: string;
}

async function getEvmTransactionReceipt(
  txHash: string
): Promise<EvmTransactionReceipt | null> {
  const response = await fetch(env.EVM_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  });

  if (!response.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to reach EVM node for transaction verification',
    });
  }

  const data = (await response.json()) as {
    result?: EvmTransactionReceipt | null;
    error?: { message: string };
  };

  if (data.error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `EVM RPC error: ${data.error.message}`,
    });
  }

  return data.result ?? null;
}

const GAME_MARKET_ADDRESS = (
  process.env.NEXT_PUBLIC_GAME_MARKET_ADDRESS ?? ''
).toLowerCase();

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

function requireDb() {
  if (!db) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database not available',
    });
  }
  return db.collection(marketOrdersCollection);
}

export const marketRouter = createTRPCRouter({
  createOrder: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        itemId: z.string(),
        title: z.string(),
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

      const receipt = await getEvmTransactionReceipt(input.transactionHash);

      if (!receipt) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Transaction not found on-chain. Please wait for confirmation and retry.',
        });
      }

      if (receipt.status !== '0x1') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction reverted on-chain',
        });
      }

      if (
        GAME_MARKET_ADDRESS &&
        receipt.to?.toLowerCase() !== GAME_MARKET_ADDRESS
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Transaction was not sent to the GameMarket contract',
        });
      }

      const existingTx = await collection.findOne({
        transactionHash: input.transactionHash,
      });
      if (existingTx) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An order with this transaction hash already exists',
        });
      }

      const existing = await collection.findOne({ orderId: input.orderId });
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Order #${input.orderId} already exists`,
        });
      }

      const doc = {
        ...input,
        maker: input.maker.toLowerCase(),
        token: input.token.toLowerCase(),
        paymentToken: input.paymentToken.toLowerCase(),
        status: 'OPEN' as const,
        image: `./items/${input.itemId}.png`,
        createdAt: new Date().toISOString(),
      };

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
      const collection = requireDb();
      const filter: Record<string, unknown> = { status: 'OPEN' };

      if (input?.paymentToken)
        filter.paymentToken = input.paymentToken.toLowerCase();
      if (input?.nameHash) filter.nameHash = input.nameHash;
      if (input?.minPrice ?? input?.maxPrice) {
        const priceFilter: Record<string, string> = {};
        if (input?.minPrice) priceFilter.$gte = input.minPrice;
        if (input?.maxPrice) priceFilter.$lte = input.maxPrice;
        filter.price = priceFilter;
      }

      const sortField = input?.sortBy ?? 'createdAt';
      const sortDir = input?.sortOrder === 'asc' ? 1 : -1;

      return collection
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      const order = await collection.findOne({ orderId: input.orderId });
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order #${input.orderId} not found`,
        });
      }
      return order as unknown as MarketOrder;
    }),

  getUserSellingOrders: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      return collection
        .find({
          maker: input.address.toLowerCase(),
          status: { $in: ['OPEN', 'PAUSED'] },
        })
        .sort({ createdAt: -1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getUserOrders: publicProcedure
    .input(
      z.object({
        address: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const collection = requireDb();
      const filter: Record<string, unknown> = {
        maker: input.address.toLowerCase(),
      };
      if (input.status) filter.status = input.status;

      return collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getUserHistory: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      const address = input.address.toLowerCase();
      return collection
        .find({
          $or: [{ maker: address }, { taker: address }],
          status: 'FILLED',
        })
        .sort({ filledAt: -1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getUserPurchases: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      return collection
        .find({
          taker: input.address.toLowerCase(),
          status: 'FILLED',
        })
        .sort({ filledAt: -1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getUserSales: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      return collection
        .find({
          maker: input.address.toLowerCase(),
          status: 'FILLED',
        })
        .sort({ filledAt: -1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getOrdersByItem: publicProcedure
    .input(
      z.object({
        nameHash: z.string(),
        status: OrderStatusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const collection = requireDb();
      const filter: Record<string, unknown> = { nameHash: input.nameHash };
      if (input.status) filter.status = input.status;

      return collection
        .find(filter)
        .sort({ price: 1 })
        .toArray() as unknown as Promise<MarketOrder[]>;
    }),

  getFloorPrice: publicProcedure
    .input(z.object({ nameHash: z.string() }))
    .query(async ({ input }) => {
      const collection = requireDb();
      const order = await collection
        .find({ nameHash: input.nameHash, status: 'OPEN' })
        .sort({ price: 1 })
        .limit(1)
        .next();
      return { floorPrice: (order?.price as string) ?? null };
    }),

  getStats: publicProcedure.query(async () => {
    const collection = requireDb();
    const [totalOrders, openOrders, filledOrders, canceledOrders] =
      await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({ status: 'OPEN' }),
        collection.countDocuments({ status: 'FILLED' }),
        collection.countDocuments({ status: 'CANCELED' }),
      ]);
    return { totalOrders, openOrders, filledOrders, canceledOrders };
  }),

  getIndexerStatus: publicProcedure.query(async () => {
    const collection = requireDb();
    const state = await db!
      .collection('indexerstate')
      .findOne({}, { sort: { _id: -1 } });
    return {
      isRunning: false,
      reconnectAttempts: 0,
      contractAddress: '',
      lastProcessedBlock: (state?.lastProcessedBlock as number) ?? undefined,
      isFullySynced: (state?.isFullySynced as boolean) ?? undefined,
      totalOrdersIndexed:
        (state?.totalOrdersIndexed as number) ??
        (await collection.countDocuments()),
      lastUpdated: (state?.lastUpdated as string) ?? undefined,
    };
  }),
});

export type MarketRouter = typeof marketRouter;

import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';
import type {
  IInventoryItem,
  IInventoryArmorItem,
  IInventoryArmorItemDB,
  AnyInventoryItem,
  AnyInventoryItemDB,
} from '@/lib/types/Inventory';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const collectionName = 'inventoryitems';

// Helper function to populate improvement requirements
async function populateArmorItem(
  item: IInventoryArmorItemDB,
  allItems: IInventoryItem[]
): Promise<IInventoryArmorItem> {
  return {
    ...item,
    improvementRequirements: (item.improvementRequirements ?? []).map((req) => ({
      item: allItems.find((i) => i.id === req.itemId)!,
      amount: req.amount,
    })),
  };
}

// Helper to check if item is armor type
function isArmorItemDB(item: AnyInventoryItemDB): item is IInventoryArmorItemDB {
  return item.type === 'armor' && 'wearableSlot' in item;
}

// Helper function to populate any item
async function populateItem(
  item: AnyInventoryItemDB,
  allItems: IInventoryItem[]
): Promise<AnyInventoryItem> {
  if (isArmorItemDB(item)) {
    return populateArmorItem(item, allItems);
  }
  return item as IInventoryItem;
}

// Helper to get all craft items for population
async function getCraftItemsForPopulation(): Promise<IInventoryItem[]> {
  if (!db) return [];
  const items = await db
    .collection(collectionName)
    .find({ type: 'craft' })
    .toArray();
  return items as unknown as IInventoryItem[];
}

export const itemsRouter = createTRPCRouter({
  // Get all items (populated)
  getAll: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(collectionName)
      .find({})
      .toArray()) as unknown as AnyInventoryItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get a single item by id (populated)
  getOne: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const item = (await db
        .collection(collectionName)
        .findOne({ id: input.id })) as unknown as AnyInventoryItemDB | null;

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Item with id "${input.id}" not found`,
        });
      }

      const craftItems = await getCraftItemsForPopulation();
      return populateItem(item, craftItems);
    }),

  // Get items by type (populated)
  getByType: publicProcedure
    .input(z.object({ type: z.enum(['armor', 'craft', 'gems']) }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const items = (await db
        .collection(collectionName)
        .find({ type: input.type })
        .toArray()) as unknown as AnyInventoryItemDB[];

      const craftItems = await getCraftItemsForPopulation();

      const populatedItems = await Promise.all(
        items.map((item) => populateItem(item, craftItems))
      );

      return populatedItems;
    }),

  // Get all craft items (no population needed)
  getCraftItems: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = await db
      .collection(collectionName)
      .find({ type: 'craft' })
      .toArray();

    return items as unknown as IInventoryItem[];
  }),

  // Get all armor items (arms, legs, belt) - populated
  getArmorItems: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(collectionName)
      .find({
        type: 'armor',
        wearableSlot: { $in: ['arms', 'legs', 'belt'] },
      })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get all accessories (necklace, gem, ring) - populated
  getAccessories: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(collectionName)
      .find({
        type: 'armor',
        wearableSlot: { $in: ['necklace', 'gem', 'ring'] },
      })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get all armor and accessories combined - populated
  getAllArmorAndAccessories: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(collectionName)
      .find({ type: 'armor' })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get items by slot - populated
  getBySlot: publicProcedure
    .input(
      z.object({
        slot: z.enum(['arms', 'legs', 'belt', 'necklace', 'gem', 'ring']),
      })
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const items = (await db
        .collection(collectionName)
        .find({ wearableSlot: input.slot })
        .toArray()) as unknown as IInventoryArmorItemDB[];

      const craftItems = await getCraftItemsForPopulation();

      const populatedItems = await Promise.all(
        items.map((item) => populateArmorItem(item, craftItems))
      );

      return populatedItems;
    }),

  // Get items by rarity - populated
  getByRarity: publicProcedure
    .input(z.object({ rarity: z.enum(['common', 'uncommon', 'unique']) }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const items = (await db
        .collection(collectionName)
        .find({ rarity: input.rarity })
        .toArray()) as unknown as AnyInventoryItemDB[];

      const craftItems = await getCraftItemsForPopulation();

      const populatedItems = await Promise.all(
        items.map((item) => populateItem(item, craftItems))
      );

      return populatedItems;
    }),
});

export type ItemsRouter = typeof itemsRouter;

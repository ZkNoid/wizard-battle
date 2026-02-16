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
  IUserInventoryRecord,
  IUserInventoryItem,
} from '@/lib/types/Inventory';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const itemsCollection = 'iteminventory';
const userInventoryCollection = 'userinventory';

// ============================================
// Helper functions for item population
// ============================================

async function populateArmorItem(
  item: IInventoryArmorItemDB,
  allCraftItems: IInventoryItem[]
): Promise<IInventoryArmorItem> {
  return {
    ...item,
    improvementRequirements: (item.improvementRequirements ?? []).map(
      (req) => ({
        item: allCraftItems.find((i) => i.id === req.itemId)!,
        amount: req.amount,
      })
    ),
  };
}

function isArmorItemDB(
  item: AnyInventoryItemDB
): item is IInventoryArmorItemDB {
  return item.type === 'armor' && 'wearableSlot' in item;
}

async function populateItem(
  item: AnyInventoryItemDB,
  allCraftItems: IInventoryItem[]
): Promise<AnyInventoryItem> {
  if (isArmorItemDB(item)) {
    return populateArmorItem(item, allCraftItems);
  }
  return item as IInventoryItem;
}

async function getCraftItemsForPopulation(): Promise<IInventoryItem[]> {
  if (!db) return [];
  const items = await db
    .collection(itemsCollection)
    .find({ type: 'craft' })
    .toArray();
  return items as unknown as IInventoryItem[];
}

async function getAllItemDefinitions(): Promise<AnyInventoryItemDB[]> {
  if (!db) return [];
  const items = await db.collection(itemsCollection).find({}).toArray();
  return items as unknown as AnyInventoryItemDB[];
}

// ============================================
// Item Definitions Router (global item catalog)
// ============================================

export const itemsRouter = createTRPCRouter({
  // ==========================================
  // ITEM DEFINITIONS (global catalog)
  // ==========================================

  // Get all item definitions (populated)
  getAll: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(itemsCollection)
      .find({})
      .toArray()) as unknown as AnyInventoryItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get a single item definition by id (populated)
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
        .collection(itemsCollection)
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

  // Get item definitions by type (populated)
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
        .collection(itemsCollection)
        .find({ type: input.type })
        .toArray()) as unknown as AnyInventoryItemDB[];

      const craftItems = await getCraftItemsForPopulation();

      const populatedItems = await Promise.all(
        items.map((item) => populateItem(item, craftItems))
      );

      return populatedItems;
    }),

  // Get all craft item definitions (no population needed)
  getCraftItems: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = await db
      .collection(itemsCollection)
      .find({ type: 'craft' })
      .toArray();

    return items as unknown as IInventoryItem[];
  }),

  // Get all armor item definitions - populated
  getArmorItems: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(itemsCollection)
      .find({
        type: 'armor',
        wearableSlot: { $in: ['Gloves', 'Boots', 'Belt'] },
      })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get all accessory definitions - populated
  getAccessories: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(itemsCollection)
      .find({
        type: 'armor',
        wearableSlot: { $in: ['Amulet', 'Orb', 'Ring'] },
      })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // Get all armor and accessories definitions - populated
  getAllArmorAndAccessories: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const items = (await db
      .collection(itemsCollection)
      .find({ type: 'armor' })
      .toArray()) as unknown as IInventoryArmorItemDB[];

    const craftItems = await getCraftItemsForPopulation();

    const populatedItems = await Promise.all(
      items.map((item) => populateArmorItem(item, craftItems))
    );

    return populatedItems;
  }),

  // ==========================================
  // USER INVENTORY (user-owned items)
  // ==========================================

  // Get all items owned by a user (populated)
  getUserInventory: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Get user's inventory records
      const userRecords = (await db
        .collection(userInventoryCollection)
        .find({ userId: input.userId })
        .toArray()) as unknown as IUserInventoryRecord[];

      if (userRecords.length === 0) {
        return [];
      }

      // Get all item definitions and craft items for population
      const [allItems, craftItems] = await Promise.all([
        getAllItemDefinitions(),
        getCraftItemsForPopulation(),
      ]);

      // Populate each user inventory record with full item data
      const populatedInventory: IUserInventoryItem[] = await Promise.all(
        userRecords.map(async (record) => {
          const itemDef = allItems.find((i) => i.id === record.itemId);
          if (!itemDef) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Item definition for "${record.itemId}" not found`,
            });
          }

          const populatedItem = await populateItem(itemDef, craftItems);

          return {
            item: populatedItem,
            quantity: record.quantity,
            isEquipped: record.isEquipped,
            equippedToWizardId: record.equippedToWizardId,
            acquiredAt: record.acquiredAt,
            acquiredFrom: record.acquiredFrom,
          };
        })
      );

      return populatedInventory;
    }),

  // Get user's inventory filtered by item type
  getUserInventoryByType: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(['armor', 'craft', 'gems']),
      })
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Get item IDs of the requested type
      const itemsOfType = (await db
        .collection(itemsCollection)
        .find({ type: input.type })
        .toArray()) as unknown as AnyInventoryItemDB[];

      const itemIds = itemsOfType.map((i) => i.id);

      // Get user's inventory records for those items
      const userRecords = (await db
        .collection(userInventoryCollection)
        .find({
          userId: input.userId,
          itemId: { $in: itemIds },
        })
        .toArray()) as unknown as IUserInventoryRecord[];

      if (userRecords.length === 0) {
        return [];
      }

      const craftItems = await getCraftItemsForPopulation();

      // Populate
      const populatedInventory: IUserInventoryItem[] = await Promise.all(
        userRecords.map(async (record) => {
          const itemDef = itemsOfType.find((i) => i.id === record.itemId);
          if (!itemDef) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Item definition for "${record.itemId}" not found`,
            });
          }

          const populatedItem = await populateItem(itemDef, craftItems);

          return {
            item: populatedItem,
            quantity: record.quantity,
            isEquipped: record.isEquipped,
            equippedToWizardId: record.equippedToWizardId,
            acquiredAt: record.acquiredAt,
            acquiredFrom: record.acquiredFrom,
          };
        })
      );

      return populatedInventory;
    }),

  // Get user's equipped items for a specific wizard
  getUserEquippedItems: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        wizardId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Get equipped records for this wizard
      const userRecords = (await db
        .collection(userInventoryCollection)
        .find({
          userId: input.userId,
          isEquipped: true,
          equippedToWizardId: input.wizardId,
        })
        .toArray()) as unknown as IUserInventoryRecord[];

      if (userRecords.length === 0) {
        return [];
      }

      const [allItems, craftItems] = await Promise.all([
        getAllItemDefinitions(),
        getCraftItemsForPopulation(),
      ]);

      const populatedInventory: IUserInventoryItem[] = await Promise.all(
        userRecords.map(async (record) => {
          const itemDef = allItems.find((i) => i.id === record.itemId);
          if (!itemDef) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: `Item definition for "${record.itemId}" not found`,
            });
          }

          const populatedItem = await populateItem(itemDef, craftItems);

          return {
            item: populatedItem,
            quantity: record.quantity,
            isEquipped: record.isEquipped,
            equippedToWizardId: record.equippedToWizardId,
            acquiredAt: record.acquiredAt,
            acquiredFrom: record.acquiredFrom,
          };
        })
      );

      return populatedInventory;
    }),

  // Check if user owns a specific item
  userHasItem: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        itemId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const record = await db.collection(userInventoryCollection).findOne({
        userId: input.userId,
        itemId: input.itemId,
      });

      if (!record) {
        return { owned: false, quantity: 0 };
      }

      return {
        owned: true,
        quantity: (record as unknown as IUserInventoryRecord).quantity,
      };
    }),
});

export type ItemsRouter = typeof itemsRouter;

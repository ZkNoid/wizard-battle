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
  IWearRequirement,
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
  // Transform wearRequirements from object format { class: "X", level: "Y" }
  // to array format [{ requirement: "class", value: "X" }, ...]
  let wearRequirements: IWearRequirement[] = item.wearRequirements ?? [];
  if (item.wearRequirements && !Array.isArray(item.wearRequirements)) {
    const reqObj = item.wearRequirements as unknown as Record<string, string>;
    wearRequirements = Object.entries(reqObj).map(([key, value]) => ({
      requirement: key,
      value: key === 'level' ? parseInt(value, 10) || value : value,
    })) as IWearRequirement[];
  }

  return {
    ...item,
    improvementRequirements: (item.improvementRequirements ?? []).map(
      (req) => ({
        item: allCraftItems.find((i) => i.id === req.itemId)!,
        amount: req.amount,
      })
    ),
    wearRequirements: wearRequirements ?? [],
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

  // Equip an item to a wizard
  equipItem: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        itemId: z.string(),
        wizardId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Check if user owns the item
      const userRecord = (await db.collection(userInventoryCollection).findOne({
        userId: input.userId,
        itemId: input.itemId,
      })) as unknown as IUserInventoryRecord | null;

      if (!userRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found in user inventory',
        });
      }

      // Get the item definition to check if it's equippable
      const itemDef = (await db.collection(itemsCollection).findOne({
        id: input.itemId,
      })) as unknown as AnyInventoryItemDB | null;

      if (!itemDef) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item definition not found',
        });
      }

      // Only armor items can be equipped
      if (!isArmorItemDB(itemDef)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only armor items can be equipped',
        });
      }

      const wearableSlot = itemDef.wearableSlot;

      // Get all equipped items for this wizard and unequip the one in the same slot
      const equippedItems = (await db
        .collection(userInventoryCollection)
        .find({
          userId: input.userId,
          isEquipped: true,
          equippedToWizardId: input.wizardId,
        })
        .toArray()) as unknown as IUserInventoryRecord[];

      // Check each equipped item's slot
      for (const equippedRecord of equippedItems) {
        const equippedItemDef = (await db.collection(itemsCollection).findOne({
          id: equippedRecord.itemId,
        })) as unknown as AnyInventoryItemDB | null;

        if (equippedItemDef && isArmorItemDB(equippedItemDef)) {
          if (equippedItemDef.wearableSlot === wearableSlot) {
            // Unequip this item
            await db.collection(userInventoryCollection).updateOne(
              {
                userId: input.userId,
                itemId: equippedRecord.itemId,
              },
              {
                $set: { isEquipped: false },
                $unset: { equippedToWizardId: '' },
              }
            );
          }
        }
      }

      // Equip the new item
      await db.collection(userInventoryCollection).updateOne(
        {
          userId: input.userId,
          itemId: input.itemId,
        },
        {
          $set: {
            isEquipped: true,
            equippedToWizardId: input.wizardId,
          },
        }
      );

      return { success: true, slot: wearableSlot };
    }),

  // Unequip an item from a wizard
  unequipItem: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        itemId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Update the item to unequip it
      const result = await db.collection(userInventoryCollection).updateOne(
        {
          userId: input.userId,
          itemId: input.itemId,
          isEquipped: true,
        },
        {
          $set: { isEquipped: false },
          $unset: { equippedToWizardId: '' },
        }
      );

      if (result.matchedCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Equipped item not found',
        });
      }

      return { success: true };
    }),
});

export type ItemsRouter = typeof itemsRouter;

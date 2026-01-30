import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';
import type {
  IExpedition,
  IExpeditionDB,
  IExpeditionReward,
  ILocation,
  ILocationDB,
  ExpeditionTimePeriod,
} from '@wizard-battle/common';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const expeditionsCollection = 'expeditions';
const locationsCollection = 'locations';
const itemsCollection = 'inventoryitems';

// Helper to convert time period to milliseconds
function timePeriodToMs(timePeriod: ExpeditionTimePeriod): number {
  const hours = timePeriod;
  return hours * 60 * 60 * 1000;
}

// Helper to populate expedition rewards with item data
async function populateExpeditionRewards(
  rewards: { itemId: string; amount: number }[]
): Promise<IExpeditionReward[]> {
  if (!db) return [];

  const itemIds = rewards.map((r) => r.itemId);
  const items = await db
    .collection(itemsCollection)
    .find({ id: { $in: itemIds } })
    .toArray();

  // Build a Map for O(1) lookups instead of O(n) linear search
  const itemsMap = new Map(items.map((item) => [item.id, item]));

  return rewards.map((reward) => {
    const item = itemsMap.get(reward.itemId);
    return {
      id: reward.itemId,
      name: item?.title ?? 'Unknown Item',
      image: item?.image ?? '',
      amount: reward.amount,
    };
  });
}

// Helper to populate a single expedition
async function populateExpedition(exp: IExpeditionDB): Promise<IExpedition> {
  const populatedRewards = await populateExpeditionRewards(exp.rewards);
  return {
    ...exp,
    rewards: populatedRewards,
  };
}

export const expeditionsRouter = createTRPCRouter({
  // ==========================================
  // LOCATIONS
  // ==========================================

  // Get all locations
  getLocations: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const locations = await db.collection(locationsCollection).find({}).toArray();
    return locations as unknown as ILocation[];
  }),

  // Get a single location by id
  getLocation: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const location = await db
        .collection(locationsCollection)
        .findOne({ id: input.id });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Location with id "${input.id}" not found`,
        });
      }

      return location as unknown as ILocation;
    }),

  // ==========================================
  // USER EXPEDITIONS
  // ==========================================

  // Get all expeditions for a user
  getUserExpeditions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const expeditions = (await db
        .collection(expeditionsCollection)
        .find({ userId: input.userId })
        .sort({ createdAt: -1 })
        .toArray()) as unknown as IExpeditionDB[];

      const populatedExpeditions = await Promise.all(
        expeditions.map((exp) => populateExpedition(exp))
      );

      return populatedExpeditions;
    }),

  // Get active expeditions for a user
  getActiveExpeditions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const expeditions = (await db
        .collection(expeditionsCollection)
        .find({ userId: input.userId, status: 'active' })
        .sort({ createdAt: -1 })
        .toArray()) as unknown as IExpeditionDB[];

      const populatedExpeditions = await Promise.all(
        expeditions.map((exp) => populateExpedition(exp))
      );

      return populatedExpeditions;
    }),

  // Get a single expedition by id
  getExpedition: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const expedition = (await db
        .collection(expeditionsCollection)
        .findOne({ id: input.id })) as unknown as IExpeditionDB | null;

      if (!expedition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Expedition with id "${input.id}" not found`,
        });
      }

      return populateExpedition(expedition);
    }),

  // Create a new expedition
  createExpedition: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        characterId: z.string(),
        characterRole: z.string(),
        characterImage: z.string(),
        locationId: z.string(),
        timePeriod: z.union([z.literal(1), z.literal(3), z.literal(24)]),
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Get location data
      const location = (await db
        .collection(locationsCollection)
        .findOne({ id: input.locationId })) as unknown as ILocationDB | null;

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Location with id "${input.locationId}" not found`,
        });
      }

      // Generate random rewards from location's possible rewards
      const numRewards =
        Math.floor(Math.random() * (location.maxRewards - location.minRewards + 1)) +
        location.minRewards;

      const shuffledRewards = [...location.possibleRewards].sort(
        () => Math.random() - 0.5
      );
      const selectedRewards = shuffledRewards.slice(0, numRewards).map((r) => ({
        itemId: r.itemId,
        amount: Math.floor(Math.random() * 10) + 1, // Random amount 1-10
      }));

      const timeToComplete = timePeriodToMs(input.timePeriod);
      const now = new Date();

      const newExpedition: IExpeditionDB = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: input.userId,
        characterId: input.characterId,
        characterRole: input.characterRole,
        characterImage: input.characterImage,
        locationId: input.locationId,
        locationName: location.name,
        rewards: selectedRewards,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        startedAt: now,
        completesAt: new Date(now.getTime() + timeToComplete),
        timeToComplete,
      };

      await db.collection(expeditionsCollection).insertOne(newExpedition);

      return populateExpedition(newExpedition);
    }),

  // Complete an expedition (claim rewards)
  completeExpedition: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const expedition = (await db
        .collection(expeditionsCollection)
        .findOne({ id: input.id, userId: input.userId })) as unknown as IExpeditionDB | null;

      if (!expedition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Expedition with id "${input.id}" not found`,
        });
      }

      if (expedition.status === 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Expedition already completed',
        });
      }

      // Update expedition status
      await db.collection(expeditionsCollection).updateOne(
        { id: input.id },
        {
          $set: {
            status: 'completed',
            updatedAt: new Date(),
          },
        }
      );

      // Add rewards to user inventory
      for (const reward of expedition.rewards) {
        const existingItem = await db.collection('userinventory').findOne({
          userId: input.userId,
          itemId: reward.itemId,
        });

        if (existingItem) {
          await db.collection('userinventory').updateOne(
            { userId: input.userId, itemId: reward.itemId },
            { $inc: { quantity: reward.amount } }
          );
        } else {
          await db.collection('userinventory').insertOne({
            userId: input.userId,
            itemId: reward.itemId,
            quantity: reward.amount,
            acquiredAt: new Date(),
            acquiredFrom: 'reward',
          });
        }
      }

      const updatedExpedition: IExpeditionDB = {
        ...expedition,
        status: 'completed',
        updatedAt: new Date(),
      };

      return populateExpedition(updatedExpedition);
    }),

  // Interrupt/cancel an expedition
  interruptExpedition: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const expedition = (await db
        .collection(expeditionsCollection)
        .findOne({ id: input.id, userId: input.userId })) as unknown as IExpeditionDB | null;

      if (!expedition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Expedition with id "${input.id}" not found`,
        });
      }

      if (expedition.status !== 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only interrupt active expeditions',
        });
      }

      // Calculate partial rewards based on time elapsed
      const now = new Date();
      const startedAt = expedition.startedAt ?? expedition.createdAt;
      const elapsed = now.getTime() - new Date(startedAt).getTime();
      const progress = Math.min(elapsed / expedition.timeToComplete, 1);

      // Give partial rewards (50% of what would have been earned based on progress)
      const partialRewards = expedition.rewards.map((r) => ({
        ...r,
        amount: Math.max(1, Math.floor(r.amount * progress * 0.5)),
      }));

      // Update expedition status
      await db.collection(expeditionsCollection).updateOne(
        { id: input.id },
        {
          $set: {
            status: 'completed',
            rewards: partialRewards,
            updatedAt: now,
          },
        }
      );

      // Add partial rewards to user inventory
      for (const reward of partialRewards) {
        const existingItem = await db.collection('userinventory').findOne({
          userId: input.userId,
          itemId: reward.itemId,
        });

        if (existingItem) {
          await db.collection('userinventory').updateOne(
            { userId: input.userId, itemId: reward.itemId },
            { $inc: { quantity: reward.amount } }
          );
        } else {
          await db.collection('userinventory').insertOne({
            userId: input.userId,
            itemId: reward.itemId,
            quantity: reward.amount,
            acquiredAt: now,
            acquiredFrom: 'reward',
          });
        }
      }

      const updatedExpedition: IExpeditionDB = {
        ...expedition,
        status: 'completed',
        rewards: partialRewards,
        updatedAt: now,
      };

      return populateExpedition(updatedExpedition);
    }),
});

export type ExpeditionsRouter = typeof expeditionsRouter;


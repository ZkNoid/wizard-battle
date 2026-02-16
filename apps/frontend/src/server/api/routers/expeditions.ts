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
} from '@wizard-battle/common';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const expeditionsCollection = 'expeditions';
const locationsCollection = 'locations';
const itemsCollection = 'iteminventory';

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

  return rewards.map((reward) => {
    const item = items.find((i) => i.id === reward.itemId);
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

    const locations = await db
      .collection(locationsCollection)
      .find({})
      .toArray();
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
        timePeriod: z.union([z.literal(1), z.literal(3), z.literal(8)]),
      })
    )
    .mutation(async ({ input }) => {
      // Call the backend NestJS expedition endpoint
      const backendUrl = env.BACKEND_URL || 'http://localhost:3030';

      try {
        const response = await fetch(`${backendUrl}/expeditions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: input.userId,
            characterId: input.characterId,
            characterRole: input.characterRole,
            characterImage: input.characterImage,
            locationId: input.locationId,
            timePeriod: input.timePeriod,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Backend expedition create error:', errorData);

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: errorData.message || 'Failed to create expedition',
          });
        }

        const expedition = (await response.json()) as IExpeditionDB;
        return populateExpedition(expedition);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Expedition create error:', error);

        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error &&
            (error.message.includes('fetch') ||
              error.message.includes('ECONNREFUSED') ||
              error.message.includes('network')));

        if (isNetworkError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Backend service unavailable: ${error instanceof Error ? error.message : 'Connection failed'}`,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create expedition: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error,
        });
      }
    }),

  // Complete an expedition (claim rewards)
  completeExpedition: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      // Call the backend NestJS expedition complete endpoint
      const backendUrl = env.BACKEND_URL || 'http://localhost:3030';

      try {
        const response = await fetch(
          `${backendUrl}/expeditions/${input.userId}/${input.id}/complete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Backend expedition complete error:', errorData);

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: errorData.message || 'Failed to complete expedition',
          });
        }

        const expedition = (await response.json()) as IExpeditionDB;
        return populateExpedition(expedition);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Expedition complete error:', error);

        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error &&
            (error.message.includes('fetch') ||
              error.message.includes('ECONNREFUSED') ||
              error.message.includes('network')));

        if (isNetworkError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Backend service unavailable: ${error instanceof Error ? error.message : 'Connection failed'}`,
            cause: error,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to complete expedition: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error,
        });
      }
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

      const expedition = (await db.collection(expeditionsCollection).findOne({
        id: input.id,
        userId: input.userId,
      })) as unknown as IExpeditionDB | null;

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

      // Minimum 10% progress required to receive any rewards
      const MIN_PROGRESS_FOR_REWARDS = 0.1;

      // Give partial rewards (50% of what would have been earned based on progress)
      // No minimum amount - if progress is too low, reward is 0
      const partialRewards = expedition.rewards
        .map((r) => ({
          ...r,
          amount:
            progress >= MIN_PROGRESS_FOR_REWARDS
              ? Math.floor(r.amount * progress * 0.5)
              : 0,
        }))
        .filter((r) => r.amount > 0);

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
          await db
            .collection('userinventory')
            .updateOne(
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

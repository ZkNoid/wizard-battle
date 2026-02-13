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
const itemsCollection = 'iteminventory';

// Helper to convert time period to milliseconds
function timePeriodToMs(timePeriod: ExpeditionTimePeriod): number {
  const hours = timePeriod;
  return hours * 60 * 60 * 1000;
}

// Unique items pool - can drop from any location with 10% chance per roll
const UNIQUE_ITEMS_POOL: string[] = [
  'BlackOrb',
  'ShardOfIllusion',
  'SilverThread',
  'ChainLink',
  'ReinforcedPadding',
  'ShadowstepLeather',
];

// Reward configuration per time period
const REWARD_CONFIG: Record<
  ExpeditionTimePeriod,
  {
    uniqueRolls: number;
    uniqueChance: number;
    uncommonCount: number;
    commonCount: number;
  }
> = {
  1: { uniqueRolls: 5, uniqueChance: 0.1, uncommonCount: 1, commonCount: 5 },
  3: { uniqueRolls: 10, uniqueChance: 0.1, uncommonCount: 2, commonCount: 10 },
  24: { uniqueRolls: 20, uniqueChance: 0.1, uncommonCount: 4, commonCount: 20 },
};

// Generate rewards based on time period and location biome
function generateRewards(
  commonRewards: string[],
  uncommonRewards: string[],
  timePeriod: ExpeditionTimePeriod
): { itemId: string; amount: number }[] {
  const config = REWARD_CONFIG[timePeriod];
  const rewards = new Map<string, number>();

  const addReward = (itemId: string, amount: number) => {
    rewards.set(itemId, (rewards.get(itemId) ?? 0) + amount);
  };

  // Roll for unique items (X rolls at 10% chance each)
  for (let i = 0; i < config.uniqueRolls; i++) {
    if (Math.random() < config.uniqueChance) {
      const randomUnique =
        UNIQUE_ITEMS_POOL[Math.floor(Math.random() * UNIQUE_ITEMS_POOL.length)];
      if (randomUnique) {
        addReward(randomUnique, 1);
      }
    }
  }

  // Add guaranteed uncommon items from biome
  if (uncommonRewards.length > 0) {
    for (let i = 0; i < config.uncommonCount; i++) {
      const randomUncommon =
        uncommonRewards[Math.floor(Math.random() * uncommonRewards.length)];
      if (randomUncommon) {
        addReward(randomUncommon, 1);
      }
    }
  }

  // Add guaranteed common items from biome
  if (commonRewards.length > 0) {
    for (let i = 0; i < config.commonCount; i++) {
      const randomCommon =
        commonRewards[Math.floor(Math.random() * commonRewards.length)];
      if (randomCommon) {
        addReward(randomCommon, 1);
      }
    }
  }

  return Array.from(rewards.entries()).map(([itemId, amount]) => ({
    itemId,
    amount,
  }));
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

      // Check if character is already in an active expedition
      const existingExpedition = await db
        .collection(expeditionsCollection)
        .findOne({
          userId: input.userId,
          characterId: input.characterId,
          status: 'active',
        });

      if (existingExpedition) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This wizard is already on an active expedition',
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

      // Generate rewards based on time period and location biome
      const selectedRewards = generateRewards(
        location.commonRewards ?? [],
        location.uncommonRewards ?? [],
        input.timePeriod
      );

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

      // Atomically update expedition status from active to completed
      // This prevents double-claiming by ensuring only one request can successfully update
      const updateResult = await db
        .collection(expeditionsCollection)
        .findOneAndUpdate(
          {
            id: input.id,
            userId: input.userId,
            status: { $ne: 'completed' }, // Only update if not already completed
          },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: 'after',
          }
        );

      if (!updateResult) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Expedition not found or already completed',
        });
      }

      const expedition = updateResult as unknown as IExpeditionDB;

      // Add rewards to user inventory
      for (const reward of expedition.rewards) {
        // Use upsert with $inc to handle both new and existing items atomically
        await db.collection('userinventory').updateOne(
          { userId: input.userId, itemId: reward.itemId },
          {
            $inc: { quantity: reward.amount },
            $setOnInsert: {
              acquiredAt: new Date(),
              acquiredFrom: 'reward',
            },
          },
          { upsert: true }
        );
      }

      return populateExpedition(expedition);
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

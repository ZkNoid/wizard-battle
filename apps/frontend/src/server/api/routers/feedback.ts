import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const collectionName = 'feedback';

export const feedbackRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        description: z.string(),
        contact: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      await db.collection(collectionName).insertOne({
        contact: input.contact,
        description: input.description,
        createdAt: new Date().toISOString(),
      });

      return true;
    }),
});

export type FeedbackRouter = typeof feedbackRouter;

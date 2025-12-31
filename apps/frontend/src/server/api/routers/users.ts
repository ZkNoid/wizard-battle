import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';
import { type IUser } from '@/lib/types/IUser';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const collectionName = 'users';

export const usersRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        address: z.string(),
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
        address: input.address,
        xp: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return true;
    }),
  get: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const user = await db
        .collection(collectionName)
        .findOne({ address: input.address });

      return user as unknown as IUser;
    }),

  setName: publicProcedure
    .input(z.object({ address: z.string(), name: z.string() }))
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      await db
        .collection(collectionName)
        .updateOne(
          { address: input.address },
          { $set: { name: input.name, updatedAt: new Date().toISOString() } }
        );

      return true;
    }),

  gainXp: publicProcedure
    .input(z.object({ address: z.string(), xp: z.number() }))
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      await db
        .collection(collectionName)
        .updateOne({ address: input.address }, { $inc: { xp: input.xp } });

      return true;
    }),

  getXp: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // const user = await db
      //   .collection(collectionName)
      //   .findOne({ address: input.address });

      // return (user as unknown as IUser)?.xp ?? 0;

      await Promise.resolve(1000);

      return 17;
    }),
});

export type UsersRouter = typeof usersRouter;

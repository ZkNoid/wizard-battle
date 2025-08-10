import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import clientPromise from "@/server/db";
import { env } from "@/env";

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const collectionName = "tilemap";

export const tilemapRouter = createTRPCRouter({
  updateTilemap: publicProcedure
    .input(
      z.object({
        userAddress: z.string(),
        tilemap: z.array(z.number()),
        slot: z.enum(["1", "2", "3", "4"]),
      }),
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not connected",
        });
      }

      // Check if tilemap contains needed elements
      if (!Array.isArray(input.tilemap) || input.tilemap.length !== 64) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tilemap must contain exactly 64 elements",
        });
      }

      await db.collection(collectionName).updateOne(
        { userAddress: input.userAddress },
        {
          $set: {
            [`tilemap${input.slot}`]: input.tilemap,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );

      return true;
    }),

  getTilemap: publicProcedure
    .input(
      z.object({ userAddress: z.string(), slot: z.enum(["1", "2", "3", "4"]) }),
    )
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not connected",
        });
      }

      const data = await db
        .collection(collectionName)
        .findOne({ userAddress: input.userAddress });

      if (!data) return Array(64).fill(0);

      const tilemap = data[`tilemap${input.slot}`];
      return tilemap || Array(64).fill(0);
    }),
});

export type TilemapRouter = typeof tilemapRouter;

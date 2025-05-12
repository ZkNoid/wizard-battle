import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import clientPromise from "@/server/db";
import { env } from "@/env";

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

const collectionName = "posts";

export const postRouter = createTRPCRouter({
  hello: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not connected",
      });
    }

    const posts = await db.collection(collectionName).find({}).toArray();
    return posts;
  }),
});

export type PostRouter = typeof postRouter;

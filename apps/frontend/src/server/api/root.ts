import { createCallerFactory, createTRPCRouter } from '@/server/api/trpc';
import { feedbackRouter } from './routers/feedback';
import { itemsRouter } from './routers/items';
import { tilemapRouter } from './routers/tilemap';
import { usersRouter } from './routers/users';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  feedback: feedbackRouter,
  items: itemsRouter,
  tilemap: tilemapRouter,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

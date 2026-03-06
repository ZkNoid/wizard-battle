import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';

export const inventoryRouter = createTRPCRouter({
  syncAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const backendUrl = env.BACKEND_URL || 'http://localhost:3030';

      try {
        const response = await fetch(`${backendUrl}/game-commit/inventory/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              (errorData as { message?: string }).message ||
              'Inventory sync failed',
          });
        }

        return response.json();
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to sync inventory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error,
        });
      }
    }),
});

export type InventoryRouter = typeof inventoryRouter;

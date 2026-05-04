import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { env } from '@/env';

export const inventoryRouter = createTRPCRouter({
  /**
   * Verify a fillOrder transaction on-chain and update the buyer's inventory
   * (add item + deduct payment currency).  The backend does all the chain
   * verification; no sensitive operations are trusted from the client.
   */
  fulfillOrder: publicProcedure
    .input(
      z.object({
        txHash: z.string().startsWith('0x'),
        orderId: z.string(),
        buyerEvmAddress: z.string(),
        buyerMinaAddress: z.string(),
        /** Human-readable item name the buyer is claiming (e.g. "Iron Ore") */
        itemId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const backendUrl = env.BACKEND_URL ?? 'http://localhost:3030';

      const response = await fetch(`${backendUrl}/market/orders/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      // 204 No Content → success
      if (response.status === 204) return { success: true };

      // 409 Conflict → already processed (idempotent)
      if (response.status === 409) return { success: true, alreadyProcessed: true };

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message =
          (err as { message?: string }).message ?? 'Failed to fulfill order';
        throw new TRPCError({ code: 'BAD_REQUEST', message });
      }

      return { success: true };
    }),

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

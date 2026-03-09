import { create } from 'zustand';
import { trpcClient } from '@/trpc/vanilla';
import type { MarketOrder } from '@/server/api/routers/market';

export type OrderStatus = 'NONE' | 'OPEN' | 'PAUSED' | 'FILLED' | 'CANCELED';

interface MarketFilters {
  paymentToken?: string;
  nameHash?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: 'price' | 'createdAt' | 'orderId';
  sortOrder?: 'asc' | 'desc';
}

interface MarketStore {
  // Data
  openOrders: MarketOrder[];
  userSellingOrders: MarketOrder[];
  userHistory: MarketOrder[];

  // Filters
  filters: MarketFilters;

  // Loading states
  isLoadingOrders: boolean;
  isLoadingUserOrders: boolean;
  isLoadingHistory: boolean;

  // Error state
  error: string | null;

  // Actions
  setFilters: (filters: MarketFilters) => void;
  clearFilters: () => void;

  loadOpenOrders: (filters?: MarketFilters) => Promise<void>;
  loadUserSellingOrders: (address: string) => Promise<void>;
  loadUserHistory: (address: string) => Promise<void>;
  loadAll: (address?: string) => Promise<void>;

  // Optimistic updates after contract calls
  removeOrder: (orderId: number) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  addOrder: (order: MarketOrder) => void;

  // Clear
  clearMarketData: () => void;
}

export const useMarketStore = create<MarketStore>()((set, get) => ({
  // Initial state
  openOrders: [],
  userSellingOrders: [],
  userHistory: [],
  filters: {},
  isLoadingOrders: false,
  isLoadingUserOrders: false,
  isLoadingHistory: false,
  error: null,

  setFilters: (filters) => set({ filters }),

  clearFilters: () => set({ filters: {} }),

  loadOpenOrders: async (filters?: MarketFilters) => {
    set({ isLoadingOrders: true, error: null });

    try {
      const appliedFilters = filters || get().filters;
      const orders = await trpcClient.market.getOpenOrders.query(appliedFilters);

      set({
        openOrders: orders,
        isLoadingOrders: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load orders',
        isLoadingOrders: false,
      });
    }
  },

  loadUserSellingOrders: async (address: string) => {
    set({ isLoadingUserOrders: true, error: null });

    try {
      const orders = await trpcClient.market.getUserSellingOrders.query({
        address,
      });

      set({
        userSellingOrders: orders,
        isLoadingUserOrders: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load selling orders',
        isLoadingUserOrders: false,
      });
    }
  },

  loadUserHistory: async (address: string) => {
    set({ isLoadingHistory: true, error: null });

    try {
      const orders = await trpcClient.market.getUserHistory.query({ address });

      set({
        userHistory: orders,
        isLoadingHistory: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : 'Failed to load history',
        isLoadingHistory: false,
      });
    }
  },

  loadAll: async (address?: string) => {
    const promises: Promise<void>[] = [get().loadOpenOrders()];

    if (address) {
      promises.push(get().loadUserSellingOrders(address));
      promises.push(get().loadUserHistory(address));
    }

    await Promise.all(promises);
  },

  removeOrder: (orderId) => {
    set((state) => ({
      openOrders: state.openOrders.filter((o) => o.orderId !== orderId),
      userSellingOrders: state.userSellingOrders.filter(
        (o) => o.orderId !== orderId
      ),
    }));
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => ({
      openOrders: state.openOrders.map((o) =>
        o.orderId === orderId ? { ...o, status } : o
      ),
      userSellingOrders: state.userSellingOrders.map((o) =>
        o.orderId === orderId ? { ...o, status } : o
      ),
    }));
  },

  addOrder: (order) => {
    set((state) => ({
      openOrders:
        order.status === 'OPEN' ? [...state.openOrders, order] : state.openOrders,
      userSellingOrders: [...state.userSellingOrders, order],
    }));
  },

  clearMarketData: () =>
    set({
      openOrders: [],
      userSellingOrders: [],
      userHistory: [],
      filters: {},
      error: null,
    }),
}));

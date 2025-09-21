import { gameEventEmitter } from '@/engine';
import type { IEntity, MoveEntityEvent } from '@/engine';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface EngineStore {
  entities: IEntity[];
  addEntity: (entity: IEntity) => void;
  removeEntity: (id: string) => void;
  clearEntities: () => void;
  updateEntity: (id: string, entity: IEntity) => void;
  getEntity: (id: string) => IEntity | undefined;
  getAllEntities: () => IEntity[];
  // Initialization of the event handler
  initMovementHandler: () => () => void; // Returns cleanup function
}

// Store for engine entities, FOR FRONTEND PURPOSES ONLY
export const useEngineStore = create<EngineStore, [['zustand/immer', never]]>(
  immer((set, get) => ({
    entities: [],
    addEntity: (entity: IEntity) => {
      set((state) => {
        state.entities.push(entity);
      });
    },
    removeEntity: (id: string) => {
      set((state) => {
        state.entities = state.entities.filter((entity) => entity.id !== id);
      });
    },
    clearEntities: () => {
      set((state) => {
        state.entities = [];
      });
    },
    updateEntity: (id: string, entity: IEntity) => {
      set((state) => {
        state.entities = state.entities.map((e) => (e.id === id ? entity : e));
      });
    },
    initMovementHandler: () => {
      // Handler for movement events
      const handleMove = (event: MoveEntityEvent) => {
        const { entityId, x, y } = event;

        set((state) => {
          const entity = state.entities.find((e) => e.id === entityId);
          if (entity) {
            entity.tilemapPosition = { x, y };
          } else {
            console.warn(`[Engine] Entity ${entityId} not found`);
          }
        });
      };

      gameEventEmitter.onMove(handleMove);
      console.log(`[Engine] Movement handler initialized`);

      // Return cleanup function
      return () => {
        gameEventEmitter.offMove(handleMove);
        console.log(`[Engine] Movement handler cleaned up`);
      };
    },
    getEntity: (id: string) => {
      return get().entities.find((entity) => entity.id === id);
    },
    getAllEntities: () => {
      return get().entities;
    },
  }))
);

import { create } from 'zustand';
import { Field } from 'o1js';
import { GamePhase } from '../../../../common/types/gameplay.types';
import { SpellStats } from '../../../../common/stater/structs';

interface InGameStore {
  // Spell selection
  pickedSpellId: Field | null;
  selectedSpellStats: SpellStats | null;

  // Game state
  currentPhase: GamePhase | null;
  turnId: number;
  timeRemaining: number;

  // Player actions
  pendingActions: Array<{
    spellId: Field;
    target: Field;
    additionalData?: any;
  }>;

  // Game status
  isGameActive: boolean;
  isPlayerTurn: boolean;

  // Actions
  setPickedSpellId: (spellId: Field | null) => void;
  setSelectedSpellStats: (spellStats: SpellStats | null) => void;
  setCurrentPhase: (phase: GamePhase | null) => void;
  setTurnId: (turnId: number) => void;
  setTimeRemaining: (timeRemaining: number) => void;
  addPendingAction: (action: {
    spellId: Field;
    target: Field;
    additionalData?: any;
  }) => void;
  clearPendingActions: () => void;
  setGameActive: (isActive: boolean) => void;
  setPlayerTurn: (isPlayerTurn: boolean) => void;
  resetGameState: () => void;
}

export const useInGameStore = create<InGameStore>((set, get) => ({
  // Initial state
  pickedSpellId: null,
  selectedSpellStats: null,
  currentPhase: null,
  turnId: 0,
  timeRemaining: 0,
  pendingActions: [],
  isGameActive: false,
  isPlayerTurn: false,

  // Actions
  setPickedSpellId: (spellId: Field | null) => set({ pickedSpellId: spellId }),

  setSelectedSpellStats: (spellStats: SpellStats | null) =>
    set({ selectedSpellStats: spellStats }),

  setCurrentPhase: (phase: GamePhase | null) => set({ currentPhase: phase }),

  setTurnId: (turnId: number) => set({ turnId }),

  setTimeRemaining: (timeRemaining: number) => set({ timeRemaining }),

  addPendingAction: (action) =>
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    })),

  clearPendingActions: () => set({ pendingActions: [] }),

  setGameActive: (isActive: boolean) => set({ isGameActive: isActive }),

  setPlayerTurn: (isPlayerTurn: boolean) => set({ isPlayerTurn }),

  resetGameState: () =>
    set({
      pickedSpellId: null,
      selectedSpellStats: null,
      currentPhase: null,
      turnId: 0,
      timeRemaining: 0,
      pendingActions: [],
      isGameActive: false,
      isPlayerTurn: false,
    }),
}));

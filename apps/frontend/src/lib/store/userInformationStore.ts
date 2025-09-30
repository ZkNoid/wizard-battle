import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { Stater } from '../../../../common/stater/stater';
import {
  spellStatsAmount,
  type PublicState,
  type State,
} from '../../../../common/stater/state';
import { Field, Int64 } from 'o1js';
import { SpellStats } from '../../../../common/stater/structs';
import type { GamePhaseManager } from '@/game/GamePhaseManager';
interface UserInformationStore {
  socket: Socket | null;
  stater: Stater | null;
  opponentState: State | null;
  gamePhaseManager: GamePhaseManager | null;
  actionSend: boolean;
  setSocket: (socket: Socket) => void;
  setStater: (stater: Stater) => void;
  setMap: (map: Field[] | number[]) => void;
  setOpponentState: (opponentState: State) => void;
  setCurrentWizard: (wizardId: Field) => void;
  setSelectedSkills: (skills: SpellStats[]) => void;
  setGamePhaseManager: (gamePhaseManager: GamePhaseManager) => void;
  setActionSend: (actionSend: boolean) => void;
  clearSocket: () => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  opponentState: null,
  gamePhaseManager: null,
  actionSend: false,
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
  setOpponentState: (opponentState: State) => set({ opponentState }),
  setCurrentWizard: (wizardId: Field) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.state;
      if (!currentState) return state;

      currentState.wizardId = wizardId;

      return { stater: state.stater };
    }),
  setSelectedSkills: (skills: SpellStats[]) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.state;
      if (!currentState) return state;

      const nonEmptySkills = skills.filter((s) => s.spellId.toString() !== '0');

      currentState.spellStats = [
        ...nonEmptySkills,
        ...Array(spellStatsAmount - nonEmptySkills.length).fill(
          new SpellStats({
            spellId: Field(0),
            cooldown: Int64.from(0),
            currentColldown: Int64.from(0),
          })
        ),
      ];
      return { stater: state.stater };
    }),
  setMap: (map: Field[] | number[]) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.state;
      if (!currentState) return state;
      currentState.map = map.map((item) => Field.from(item));
      return { stater: state.stater };
    }),
  setGamePhaseManager: (gamePhaseManager: GamePhaseManager) =>
    set({ gamePhaseManager }),
  setActionSend: (actionSend: boolean) => set({ actionSend }),
  clearSocket: () => {
    set((state) => {
      if (state.socket) {
        state.socket.disconnect();
      }
      return {
        socket: null,
      };
    });
  },
}));

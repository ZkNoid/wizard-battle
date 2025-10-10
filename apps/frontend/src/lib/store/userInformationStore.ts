import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { Stater } from '../../../../common/stater/stater';
import {
  spellStatsAmount,
  type PublicState,
  type State,
} from '../../../../common/stater/state';
import { Field, Int64 } from 'o1js';
import {
  Position,
  PositionOption,
  SpellStats,
} from '../../../../common/stater/structs';
import type { GamePhaseManager } from '@/game/GamePhaseManager';
import { allWizards } from '../../../../common/wizards';
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
  setDefaultState: () => void;
  clearSocket: () => void;
  isBootstrapped: boolean;
  setBootstrapped: (bootstrapped: boolean) => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  opponentState: null,
  gamePhaseManager: null,
  actionSend: false,
  isBootstrapped: false,
  setBootstrapped: (bootstrapped: boolean) =>
    set({ isBootstrapped: bootstrapped }),
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
  setOpponentState: (opponentState: State) => set({ opponentState }),
  setCurrentWizard: (wizardId: Field) =>
    set((state) => {
      if (!state.stater) return state;

      const wizard = allWizards.find(
        (w) => w.id.toString() === wizardId.toString()
      );
      if (!wizard) return state;

      state.stater.state = wizard.defaultState();
      state.stater.state.playerStats.position.value.x = Int64.from(
        Math.floor(Math.random() * 8)
      );
      state.stater.state.playerStats.position.value.y = Int64.from(
        Math.floor(Math.random() * 8)
      );

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
            currentCooldown: Int64.from(0),
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
  setDefaultState: () => {
    set((state) => {
      if (!state.stater) {
        return state;
      }

      let wizard = allWizards.find(
        (wizard) =>
          wizard.id.toString() === state.stater?.state.wizardId.toString()
      );

      if (!wizard) {
        console.log('setDefaultState: wizard not found');
        return state;
      }

      state.stater.state = wizard.defaultState();
      state.stater.state.playerStats.position = new PositionOption({
        value: new Position({
          x: Int64.from(Math.floor(Math.random() * 8)),
          y: Int64.from(Math.floor(Math.random() * 8)),
        }),
        isSome: Field(1),
      });

      return state;
    });
  },
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

import { create } from "zustand";
import { Socket } from "socket.io-client";
import { Stater } from "../../../../common/stater/stater";
import type { PublicState } from "../../../../common/stater/state";
import { Field } from "o1js";
import type { SpellStats } from "../../../../common/stater/structs";
interface UserInformationStore {
  socket: Socket | null;
  stater: Stater | null;
  opponentState: PublicState | null;
  setSocket: (socket: Socket) => void;
  setStater: (stater: Stater) => void;
  setMap: (map: Field[] | number[]) => void;
  // setOpponentState: (opponentState: PublicState) => void;
  setCurrentWizard: (wizardId: Field) => void;
  setSelectedSkills: (skills: SpellStats[]) => void;
  clearSocket: () => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  opponentState: null,
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
  // setOpponentState: (opponentState: PublicState) => set({ opponentState }),
  setCurrentWizard: (wizardId: Field) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.state;
      if (!currentState) return state;

      currentState.playerId = wizardId;

      return { stater: state.stater };
    }),
  setSelectedSkills: (skills: SpellStats[]) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.state;
      if (!currentState) return state;

      currentState.spellStats = skills;
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

import { create } from "zustand";
import { Socket } from "socket.io-client";
import { Stater, UserState, type PublicState } from "../../../../common/stater";
import type { Spell } from "../../../../common/types/matchmaking.types";
interface UserInformationStore {
  socket: Socket | null;
  stater: Stater | null;
  opponentState: PublicState | null;
  setSocket: (socket: Socket) => void;
  setStater: (stater: Stater) => void;
  setOpponentState: (opponentState: PublicState) => void;
  setCurrentWizard: (wizardId: string) => void;
  setSelectedSkills: (skills: Spell[]) => void;
  clearSocket: () => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  opponentState: null,
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
  setOpponentState: (opponentState: PublicState) => set({ opponentState }),
  setCurrentWizard: (wizardId: string) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.getCurrentState();
      if (!currentState) return state;

      if (state.stater.stateHistory[0]) {
        state.stater.stateHistory[0].wizardId = wizardId;
      }
      return { stater: state.stater };
    }),
  setSelectedSkills: (skills: Spell[]) =>
    set((state) => {
      if (!state.stater) return state;
      const currentState = state.stater.getCurrentState();
      if (!currentState) return state;

      currentState.skillsInfo = skills;
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

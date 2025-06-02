import { create } from "zustand";
import { Socket } from "socket.io-client";
import { Stater, UserState, type PublicState } from "../../../../common/stater";

interface UserInformationStore {
  socket: Socket | null;
  stater: Stater | null;
  opponentState: PublicState | null;
  setSocket: (socket: Socket) => void;
  setStater: (stater: Stater) => void;
  setOpponentState: (opponentState: PublicState) => void;
  clearSocket: () => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  opponentState: null,
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
  setOpponentState: (opponentState: PublicState) => set({ opponentState }),
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

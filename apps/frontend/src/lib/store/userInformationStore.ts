import { create } from "zustand";
import { Socket } from "socket.io-client";
import { Stater } from "../../../../common/stater";

interface UserInformationStore {
  socket: Socket | null;
  stater: Stater | null;
  setSocket: (socket: Socket) => void;
  setStater: (stater: Stater) => void;
  clearSocket: () => void;
}

export const useUserInformationStore = create<UserInformationStore>((set) => ({
  socket: null,
  stater: null,
  setSocket: (socket: Socket) => set({ socket }),
  setStater: (stater: Stater) => set({ stater }),
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

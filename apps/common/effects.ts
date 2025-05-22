import { PublicState } from "./stater";

import { UserState } from "./stater";
import { EffectInfo } from "./types/matchmaking.types";

export const allEffects: EffectInfo[] = [
  {
    effectId: "poison",
    apply: (state: UserState, publicState: PublicState) => {
      state.health -= 10;
    },
  },
];

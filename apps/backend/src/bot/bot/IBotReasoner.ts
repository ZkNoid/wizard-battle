import { Action, PublicState } from "../../../../common/stater";

export interface IBotReasoner {
  findNextMove(
    opponentId: string,
    ownId: string,
    opponentPublicStates: PublicState[],
    ownPublicState: PublicState[],
  ): Action[];
}

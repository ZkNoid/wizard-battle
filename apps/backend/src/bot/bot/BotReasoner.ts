import { MAP_SIZE } from "../../../../common/constants";
import { Action, PublicState } from "../../../../common/stater";
import { Position } from "../../../../common/types/matchmaking.types";
import { IBotReasoner } from "./IBotReasoner";

const limit = (value: number) => {
  if (value < 0) {
    return 0;
  }

  if (value > MAP_SIZE - 1) {
    return MAP_SIZE - 1;
  }

  return value;
};

export class BotReasoner implements IBotReasoner {
  findNextMove(
    opponentId: string,
    ownId: string,
    opponentPublicStates: PublicState[],
    ownPublicState: PublicState[],
  ): Action[] {
    // TODO: Implement the logic to find the next move

    let attackAction = new Action(
      "fireball",
      new Position(
        limit(Math.floor(Math.random() * MAP_SIZE)),
        limit(Math.floor(Math.random() * MAP_SIZE)),
      ),
      opponentId,
    );

    let currentTurn = ownPublicState.length - 1;

    let randomXMove = Math.floor(Math.random() * 2) - 1;
    let randomYMove = Math.floor(Math.random() * 2) - 1;

    let moveAction = new Action(
      "move",
      new Position(
        limit(ownPublicState[currentTurn]!.position!.x + randomXMove),
        limit(ownPublicState[currentTurn]!.position!.y + randomYMove),
      ),
      ownId,
    );

    return [attackAction, moveAction];
  }
}

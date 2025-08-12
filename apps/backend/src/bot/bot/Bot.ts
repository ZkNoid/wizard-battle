import { Socket } from "socket.io-client";
import {
  MapStructure,
  Position,
} from "../../../../common/types/matchmaking.types";
import {
  Action,
  PublicState,
  Stater,
  UserState,
} from "../../../../common/stater";
import { IBot } from "./IBot";
import { IBotReasoner } from "./IBotReasoner";
import { BotReasoner } from "./BotReasoner";
import { allSpells } from "../../../../common/spells";
import { MAP_SIZE } from "../../../../common/constants";
export class Bot implements IBot {
  reasoner: IBotReasoner;
  private sessionId: string;
  private socket: Socket;
  private stater: Stater;
  private opponentPublicStates: PublicState[];
  private ownPublicStates: PublicState[];
  private ownId: string;
  private opponentId: string;

  constructor(opponentId: string, socket: Socket, sessionId: string) {
    this.ownId = socket.id!;
    this.opponentId = opponentId;
    this.socket = socket;
    this.sessionId = sessionId;
    const randomState = new UserState(
      this.ownId,
      "Mage",
      MapStructure.random(MAP_SIZE, MAP_SIZE),
      100,
      [
        allSpells.find((spell) => spell.id === "lightning")!,
        allSpells.find((spell) => spell.id === "fireball")!,
        allSpells.find((spell) => spell.id === "teleport")!,
      ],
      new Position(
        Math.floor(Math.random() * MAP_SIZE),
        Math.floor(Math.random() * MAP_SIZE),
      ),
      [],
    );
    this.stater = new Stater(randomState as any, sessionId); // TODO: Implement
    this.reasoner = new BotReasoner();
    this.opponentPublicStates = [];
    this.ownPublicStates = [];
  }

  /*
  client: Socket,
    payload: { sessionId: string; state: any },
  */
  makeMove() {
    const actions = this.reasoner.findNextMove(
      this.opponentId,
      this.ownId,
      this.opponentPublicStates,
      this.ownPublicStates,
    );

    this.socket.emit("submitActions", {
      socket: this.socket,
      payload: {
        sessionId: this.sessionId,
        actions: actions,
      },
    });
  }

  updateState(actions: Action[]) {
    const { commit, publicState } = this.stater.applyActions(actions);
    this.socket.emit("updatePublicState", {
      socket: this.socket,
      payload: {
        sessionId: this.sessionId,
        state: publicState,
      },
    });
  }
}

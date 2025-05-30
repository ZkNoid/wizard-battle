import { Action } from "../../../../common/stater";
import { IBotReasoner } from "./IBotReasoner";

export interface IBot {
  reasoner: IBotReasoner;
  makeMove(): void;
  updateState(actions: Action[]): void;
}

import { Field } from "o1js";
import { State } from "../state";

export interface IEffectInfo {
  id: Field;

  apply: (state: State, publicState: State) => void;
}

export const allEffectsInfo: IEffectInfo[] = [];

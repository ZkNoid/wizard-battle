import { Field, Int64 } from 'o1js';
import { State } from '../state';
import { Position } from '../structs';

export interface IEffectInfo {
  id: Field;
  name: string;

  apply: (state: State, publicState: State) => void;
}

const invisibleEffect: IEffectInfo = {
  id: Field(1),
  name: 'Invisible',
  apply: (state: State, publicState: State) => {
    publicState.playerStats.position = new Position({
      x: Int64.from(0),
      y: Int64.from(0),
    });
  },
};

export const allEffectsInfo: IEffectInfo[] = [invisibleEffect];

const EffectsId: Record<string, Field> = {};

allEffectsInfo.forEach((effect) => {
  EffectsId[effect.name] = effect.id;
});

export { EffectsId };

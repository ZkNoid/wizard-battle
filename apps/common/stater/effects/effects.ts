import { CircuitString, Field, Int64 } from 'o1js';
import { State } from '../state';
import { Position, PositionOption } from '../structs';

export interface IEffectInfo {
  id: Field;
  name: string;

  apply: (state: State, publicState: State) => void;
}

const invisibleEffect: IEffectInfo = {
  id: Field(1),
  name: 'Invisible',
  apply: (state: State, publicState: State) => {
    console.log('Applying invisible effect');
    publicState.playerStats.position = new PositionOption({
      value: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
      }),
      isSome: Field(0),
    });
  },
};

const bleedingEffect: IEffectInfo = {
  id: CircuitString.fromString('Bleeding').hash(),
  name: 'Bleeding',
  apply: (state: State, publicState: State) => {
    console.log('Applying bleeding effect');
    state.playerStats.hp = state.playerStats.hp.sub(Int64.from(20));
  },
};

export const allEffectsInfo: IEffectInfo[] = [invisibleEffect, bleedingEffect];

const EffectsId: Record<string, Field> = {};

allEffectsInfo.forEach((effect) => {
  EffectsId[effect.name] = effect.id;
});

export { EffectsId };

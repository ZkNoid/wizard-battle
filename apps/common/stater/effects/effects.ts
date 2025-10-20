import { CircuitString, Field, Int64, Provable, UInt64 } from 'o1js';
import { State } from '../state';
import { Position, PositionOption } from '../structs';

export interface IEffectInfo {
  id: Field;
  name: string;

  apply: (state: State, publicState: State, param: Field) => void;
}

const invisibleEffect: IEffectInfo = {
  id: Field(1),
  name: 'Invisible',
  apply: (state: State, publicState: State, param: Field) => {
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
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying bleeding effect');
    state.playerStats.hp = state.playerStats.hp.sub(Int64.from(20));
  },
};

const decoyEffect: IEffectInfo = {
  id: CircuitString.fromString('Decoy').hash(),
  name: 'Decoy',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying decoy effect');
    // Change to provable
    let number = +param;
    let x = number % 8;
    let y = Math.floor(number / 8);
    console.log('Decoy position', x, y);
    publicState.playerStats.position = new PositionOption({
      value: new Position({
        x: Int64.from(x),
        y: Int64.from(y),
      }),
      isSome: Field(1),
    });
  },
};

const cloudEffect: IEffectInfo = {
  id: CircuitString.fromString('Cloud').hash(),
  name: 'Cloud',
  apply: (state: State, publicState: State, param: Field) => {
    console.log('Applying cloud effect');
    let number = +param;
    let x = number % 8;
    let y = Math.floor(number / 8);
    let cloudCenter = new Position({
      x: Int64.from(x),
      y: Int64.from(y),
    });

    const emptyPosition = new PositionOption({
      value: new Position({
        x: Int64.from(0),
        y: Int64.from(0),
      }),
      isSome: Field(0),
    });

    const inCloud = state.playerStats.position.value
      .manhattanDistance(cloudCenter)
      .lessThanOrEqual(UInt64.from(2));

    publicState.playerStats.position = Provable.if(
      inCloud,
      PositionOption,
      emptyPosition,
      publicState.playerStats.position
    );
  },
};

export const allEffectsInfo: IEffectInfo[] = [
  invisibleEffect,
  bleedingEffect,
  decoyEffect,
  cloudEffect,
];

const EffectsId: Record<string, Field> = {};

allEffectsInfo.forEach((effect) => {
  EffectsId[effect.name] = effect.id;
});

export { EffectsId };

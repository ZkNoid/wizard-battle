import { CircuitString, Field, Int64, Struct } from 'o1js';
import { Position, PositionOption, type SpellCast } from '../structs';
import { State } from '../state';
import { WizardId } from '../../wizards';
import { type ISpell } from './interface';

export class MoveData extends Struct({
  position: Position,
}) {}

export const MoveCast = (
  state: State,
  target: Field,
  position: Position
): SpellCast<MoveData> => {
  return {
    spellId: CircuitString.fromString('Move').hash(),
    target,
    additionalData: {
      position,
    },
  };
};

export const MoveModifyer = (state: State, spellCast: SpellCast<MoveData>) => {
  console.log('MoveModifyer', state, spellCast);

  // Fix rehydration
  console.log(state.playerStats.position.value.x);
  state.playerStats.position = new PositionOption({
    value: new Position({
      x: Int64.from(+(spellCast.additionalData.position.x.magnitude as any)),
      y: Int64.from(+(spellCast.additionalData.position.y.magnitude as any)),
    }),
    isSome: Field(1),
  });
  console.log(state.playerStats.position.value.x);
};

export const allCommonSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('Move').hash(),
    wizardId: WizardId.COMMON,
    cooldown: Field(1),
    name: 'Move',
    description: 'Move to a new position',
    image: '/wizards/skills/1.svg',
    modifyer: MoveModifyer,
    cast: MoveCast,
    defaultValue: {
      spellId: CircuitString.fromString('Move').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
];

import { CircuitString, Field, Int64, Poseidon, Struct } from 'o1js';
import { Position, PositionOption, type SpellCast } from '../structs';
import { State } from '../state';
import { WizardId } from '../../wizards';
import { type ISpell } from './interface';
import { Stater } from '../stater';

export class MoveData extends Struct({
  position: Position,
}) {}

export class MoveSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: MoveData,
  })
  implements SpellCast<MoveData>
{
  hash(): Field {
    return Poseidon.hash([
      this.caster,
      this.spellId,
      this.target,
      this.additionalData.position.hash(),
    ]);
  }
}

export const MoveCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): MoveSpellCast => {
  return new MoveSpellCast({
    spellId: CircuitString.fromString('Move').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const MoveModifier = (stater: Stater, spellCast: MoveSpellCast) => {
  console.log('MoveModifier', stater.state, spellCast);

  // Fix rehydration
  console.log(stater.state.playerStats.position.value.x);
  stater.state.playerStats.position = new PositionOption({
    value: spellCast.additionalData.position,
    isSome: Field(1),
  });
  console.log(stater.state.playerStats.position.value.x);
};

export const allCommonSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('Move').hash(),
    wizardId: WizardId.COMMON,
    cooldown: Field(1),
    name: 'Move',
    description: 'Move to a new position',
    image: '/wizards/skills/1.svg',
    modifierData: MoveData,
    modifier: MoveModifier,
    spellCast: MoveSpellCast,
    cast: MoveCast,
    target: 'ally',
    priority: 1,
    defaultValue: {
      spellId: CircuitString.fromString('Move').hash(),
      cooldown: Int64.from(1),
      currentCooldown: Int64.from(0),
    },
  },
];

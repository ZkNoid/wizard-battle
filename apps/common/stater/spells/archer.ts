import { State } from '../state';
import { Effect, Position, SpellCast } from '../structs';
import {
  CircuitString,
  Field,
  Int64,
  Poseidon,
  Provable,
  Struct,
  UInt64,
} from 'o1js';
import { ISpell } from './interface';
import { WizardId } from '../../wizards';

export class ArrowData extends Struct({
  position: Position,
}) {}

export const ArrowCast = (
  state: State,
  target: Field,
  position: Position
): SpellCast<ArrowData> => {
  return {
    spellId: CircuitString.fromString('Arrow').hash(),
    target,
    additionalData: {
      position,
    },
  };
};

export const ArrowModifyer = (
  state: State,
  spellCast: SpellCast<ArrowData>
) => {
  const selfPosition = state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));
  const nearbyHit = distance.equals(UInt64.from(1));
  const distantHit = directHit.not().and(nearbyHit.not());

  // Damage
  const damage = Int64.from(100);
  const damage2 = Int64.from(50);

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, distantHit],
    Int64,
    [damage, damage2, Int64.from(0)]
  );

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);

  // #TODO make provable
  // Bleeding effect

  const chance = Poseidon.hash([state.randomSeed]).toBigInt() % 2n;
  const isBleeding = chance === 1n;

  if (isBleeding) {
    state.pushEffect(
      new Effect({
        effectId: CircuitString.fromString('Bleeding').hash(),
        duration: Field.from(3),
      }),
      'endOfRound'
    );
  }
};

export const archerSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('Arrow').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'Arrow',
    description: 'A single arrow shot',
    image: '/wizards/skills/1.svg',
    modifyerData: ArrowData,
    modifyer: ArrowModifyer,
    cast: ArrowCast,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('Arrow').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
];

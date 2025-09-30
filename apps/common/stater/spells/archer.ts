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

export class AimingShotData extends Struct({
  position: Position,
}) {}

export const AimingShotCast = (
  state: State,
  target: Field,
  position: Position
): SpellCast<AimingShotData> => {
  return {
    spellId: CircuitString.fromString('AimingShot').hash(),
    target,
    additionalData: {
      position,
    },
  };
};

export const AimingShotModifyer = (
  state: State,
  spellCast: SpellCast<AimingShotData>
) => {
  const selfPosition = state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));

  const damage = Int64.from(100);

  let damageToApply = Provable.if(directHit, damage, Int64.from(0));

  // #TODO make provable
  // Critical hit

  let randomValue = Poseidon.hash([state.randomSeed]).toBigInt() % 100n;
  const isCritical = randomValue < 10n;

  if (isCritical) {
    damageToApply = damageToApply.mul(Int64.from(2));
  }

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);
};

export class HailOfArrowsData extends Struct({
  position: Position,
}) {}

export const HailOfArrowsCast = (
  state: State,
  target: Field,
  position: Position
): SpellCast<HailOfArrowsData> => {
  return {
    spellId: CircuitString.fromString('HailOfArrows').hash(),
    target,
    additionalData: {
      position,
    },
  };
};

export const HailOfArrowsModifyer = (
  state: State,
  spellCast: SpellCast<HailOfArrowsData>
) => {
  const selfPosition = state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const damageToApply = Provable.if(
    distance.lessThanOrEqual(UInt64.from(3)),
    Int64.from(50),
    Int64.from(0)
  );

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);

  // #TODO make provable
  // Slowing effect

  const chance = Poseidon.hash([state.randomSeed]).toBigInt() % 10n;
  const isSlowing = chance <= 2n;

  if (isSlowing) {
    state.pushEffect(
      new Effect({
        effectId: CircuitString.fromString('Slowing').hash(),
        duration: Field.from(2),
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
    image: '/wizards/skills/arrow.png',
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
  {
    id: CircuitString.fromString('AimingShot').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'AimingShot',
    description: 'A shot with a higher chance of critical hit',
    image: '/wizards/skills/aimingShot.webp',
    modifyerData: AimingShotData,
    modifyer: AimingShotModifyer,
    cast: AimingShotCast,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('AimingShot').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('HailOfArrows').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'HailOfArrows',
    description: 'A hail of arrows',
    image: '/wizards/skills/hailOfArrows.webp',
    modifyerData: HailOfArrowsData,
    modifyer: HailOfArrowsModifyer,
    cast: HailOfArrowsCast,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('HailOfArrows').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
];

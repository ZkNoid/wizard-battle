import {
  Int64,
  Poseidon,
  Provable,
  Struct,
  UInt64,
  CircuitString,
  Field,
} from 'o1js';
import { Position, type SpellCast } from '../structs';
import { WizardId } from '../../wizards';
import { type ISpell } from './interface';
import type { State } from '../state';

export class LightningBoldData extends Struct({
  position: Position,
}) {}

export const LightningBoldCast = (
  state: State,
  position: Position
): SpellCast<LightningBoldData> => {
  return {
    spellId: CircuitString.fromString('LightningBold').hash(),
    target: Field(0),
    additionalData: {
      position,
    },
  };
};
export const LightningBoldModifyer = (
  state: State,
  spellCast: SpellCast<LightningBoldData>
) => {
  const selfPosition = state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = Int64.from(100);
  const damage2 = Int64.from(50);

  const directHit = distance.equals(UInt64.from(0));
  const nearbyHit = distance.equals(UInt64.from(1));
  const distantHit = directHit.not().and(nearbyHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, distantHit],
    Int64,
    [damage, damage2, Int64.from(0)]
  );

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);
};

export class FireBallData extends Struct({
  position: Position,
}) {}

export const FireBallCast = (
  state: State,
  position: Position
): SpellCast<FireBallData> => {
  return {
    spellId: CircuitString.fromString('FireBall').hash(),
    target: Field(0),
    additionalData: {
      position,
    },
  };
};

export const FireBallModifyer = (
  state: State,
  spellCast: SpellCast<FireBallData>
) => {
  const selfPosition = state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = Int64.from(60);
  const damage2 = Int64.from(40);
  const damage3 = Int64.from(20);

  const directHit = distance.equals(UInt64.from(0));
  const nearbyHit = distance.equals(UInt64.from(1));
  const farHit = distance.equals(UInt64.from(2));
  const distantHit = directHit.not().and(nearbyHit.not()).and(farHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, farHit, distantHit],
    Int64,
    [damage, damage2, damage3, Int64.from(0)]
  );

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);
};

export class LaserData extends Struct({
  position: Position,
}) {}

export const LaserCast = (
  state: State,
  position: Position
): SpellCast<LaserData> => {
  return {
    spellId: CircuitString.fromString('Laser').hash(),
    target: Field(0),
    additionalData: {
      position,
    },
  };
};

export const LaserModifyer = (
  state: State,
  spellCast: SpellCast<LaserData>
) => {
  const selfPosition = state.playerStats.position;
  const targetPosition = spellCast.additionalData.position;

  const sameRow = selfPosition.x.equals(targetPosition.x);
  const sameColumn = selfPosition.y.equals(targetPosition.y);
  const hit = sameRow.or(sameColumn);

  const damage = Int64.from(50);

  const damageToApply = Provable.switch([hit], Int64, [damage]);

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);
};

export class TeleportData extends Struct({
  position: Position,
}) {}

export const TeleportCast = (
  state: State,
  position: Position
): SpellCast<TeleportData> => {
  return {
    spellId: CircuitString.fromString('Teleport').hash(),
    target: Field(0),
    additionalData: {
      position,
    },
  };
};

export const TeleportModifyer = (
  state: State,
  spellCast: SpellCast<TeleportData>
) => {
  state.playerStats.position = spellCast.additionalData.position;
};

export class HealData extends Struct({}) {}

export const HealCast = (state: State): SpellCast<HealData> => {
  return {
    spellId: CircuitString.fromString('Heal').hash(),
    target: Field(0),
    additionalData: {},
  };
};

export const HealModifyer = (state: State, spellCast: SpellCast<HealData>) => {
  state.playerStats.hp = state.playerStats.hp.add(Int64.from(100));
};

export const mageSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('LightningBold').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Lightning',
    description: 'A powerful bolt of lightning. High one point damage',
    image: '/wizards/skills/1.svg',
    modifyer: LightningBoldModifyer,
    cast: LightningBoldCast,
    defaultValue: {
      spellId: CircuitString.fromString('LightningBold').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('FireBall').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Fire Ball',
    description: 'A ball of fire. Deals damage to a single target',
    image: '/wizards/skills/2.svg',
    modifyer: FireBallModifyer,
    cast: FireBallCast,
    defaultValue: {
      spellId: CircuitString.fromString('FireBall').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Teleport').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Teleport',
    description: 'Teleport to a random position',
    image: '/wizards/skills/3.svg',
    modifyer: TeleportModifyer,
    cast: TeleportCast,
    defaultValue: {
      spellId: CircuitString.fromString('Teleport').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Heal').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Heal',
    description: 'Heal yourself for 100 health',
    image: '/wizards/skills/4.svg',
    modifyer: HealModifyer,
    cast: HealCast,
    defaultValue: {
      spellId: CircuitString.fromString('Heal').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Laser').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Laser',
    description: 'A beam of laser. Deals damage to a single target',
    image: '/wizards/skills/5.svg',
    modifyer: LaserModifyer,
    cast: LaserCast,
    defaultValue: {
      spellId: CircuitString.fromString('Laser').hash(),
      cooldown: Int64.from(1),
      currentColldown: Int64.from(0),
    },
  },
];

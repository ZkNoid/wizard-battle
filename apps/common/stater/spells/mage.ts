import {
  Int64,
  Poseidon,
  Provable,
  Struct,
  UInt64,
  CircuitString,
  Field,
} from 'o1js';
import { Position, PositionOption, type SpellCast } from '../structs';
import { WizardId } from '../../wizards';
import { type ISpell } from './interface';
import type { State } from '../state';

export class LightningBoldData extends Struct({
  position: Position,
}) {}

export const LightningBoldCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<LightningBoldData> => {
  return {
    spellId: CircuitString.fromString('LightningBold').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  };
};
export const LightningBoldModifyer = (
  state: State,
  spellCast: SpellCast<LightningBoldData>
) => {
  const selfPosition = state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  console.log('LightningBoldModifyer');
  console.log(selfPosition);
  console.log(targetPosition);
  console.log(spellCast.additionalData);

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

const LightningBoldSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = [
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];

  positions.forEach((position) => {
    gameEmitter.throwEffect(type, 'lightning', position.x, position.y, 1.2);
  });
};

export class FireBallData extends Struct({
  position: Position,
}) {}

export const FireBallCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<FireBallData> => {
  return {
    spellId: CircuitString.fromString('FireBall').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  };
};

export const FireBallModifyer = (
  state: State,
  spellCast: SpellCast<FireBallData>
) => {
  const selfPosition = state.playerStats.position.value;
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

const FireBallSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = [
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y - 1 },
    { x: x + 2, y: y },
    { x: x - 2, y: y },
    { x: x, y: y + 2 },
    { x: x, y: y - 2 },
  ];

  positions.forEach((position) => {
    gameEmitter.throwEffect(type, 'fireball', position.x, position.y, 1.5);
  });
};

export class LaserData extends Struct({
  position: Position,
}) {}

export const LaserCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<LaserData> => {
  return {
    spellId: CircuitString.fromString('Laser').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  };
};

export const LaserModifyer = (
  state: State,
  spellCast: SpellCast<LaserData>
) => {
  const selfPosition = state.playerStats.position.value;
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
  caster: Field,
  target: Field,
  position: Position
): SpellCast<TeleportData> => {
  return {
    spellId: CircuitString.fromString('Teleport').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  };
};

export const TeleportModifyer = (
  state: State,
  spellCast: SpellCast<TeleportData>
) => {
  state.playerStats.position = new PositionOption({
    value: spellCast.additionalData.position,
    isSome: Field(1),
  });
};

export class HealData extends Struct({}) {}

export const HealCast = (
  state: State,
  caster: Field,
  target: Field
): SpellCast<HealData> => {
  return {
    spellId: CircuitString.fromString('Heal').hash(),
    caster,
    target,
    additionalData: {},
  };
};

export const HealModifyer = (state: State, spellCast: SpellCast<HealData>) => {
  state.playerStats.hp = state.playerStats.hp.add(Int64.from(100));
  // If the player has more health than the max health, set the health to the max health
  state.playerStats.hp = Provable.if(
    state.playerStats.hp.sub(state.playerStats.maxHp).isPositive(),
    state.playerStats.maxHp,
    state.playerStats.hp
  );
};

export const mageSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('LightningBold').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Lightning',
    description: 'A powerful bolt of lightning. High one point damage',
    image: '/wizards/skills/lightning.svg',
    modifyerData: LightningBoldData,
    modifyer: LightningBoldModifyer,
    cast: LightningBoldCast,
    sceneEffect: LightningBoldSceneEffect,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('LightningBold').hash(),
      cooldown: Int64.from(1),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('FireBall').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'FireBall',
    description: 'A ball of fire. Deals damage to a single target',
    image: '/wizards/skills/fireball.svg',
    modifyerData: FireBallData,
    modifyer: FireBallModifyer,
    cast: FireBallCast,
    sceneEffect: FireBallSceneEffect,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('FireBall').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Teleport').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Teleport',
    description: 'Teleport to a random position',
    image: '/wizards/skills/teleport.svg',
    modifyerData: TeleportData,
    modifyer: TeleportModifyer,
    cast: TeleportCast,
    target: 'ally',
    priority: 1,
    defaultValue: {
      spellId: CircuitString.fromString('Teleport').hash(),
      cooldown: Int64.from(4),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Heal').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Heal',
    description: 'Heal yourself for 100 health',
    image: '/wizards/skills/heal.svg',
    modifyerData: HealData,
    modifyer: HealModifyer,
    cast: HealCast,
    target: 'ally',
    priority: 1,
    defaultValue: {
      spellId: CircuitString.fromString('Heal').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Laser').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Laser',
    description: 'A beam of laser. Deals damage to a single target',
    image: '/wizards/skills/laser.svg',
    modifyerData: LaserData,
    modifyer: LaserModifyer,
    cast: LaserCast,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('Laser').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
];

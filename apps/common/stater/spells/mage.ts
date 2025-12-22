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
import { State } from '../state';
import { Stater } from '../stater';

export class LightningBoldData extends Struct({
  position: Position,
}) {}

export class LightningBoldSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: LightningBoldData,
  })
  implements SpellCast<LightningBoldData>
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

export const LightningBoldCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): LightningBoldSpellCast => {
  return new LightningBoldSpellCast({
    spellId: CircuitString.fromString('LightningBold').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const LightningBoldModifier = (
  stater: Stater,
  spellCast: LightningBoldSpellCast,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  console.log('LightningBoldModifier');
  console.log(selfPosition);
  console.log(targetPosition);
  console.log(spellCast.additionalData);

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = UInt64.from(80);
  const damage2 = UInt64.from(40);

  const directHit = distance.equals(UInt64.from(0));
  const nearbyHit = distance.equals(UInt64.from(1));
  const distantHit = directHit.not().and(nearbyHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, distantHit],
    UInt64,
    [damage, damage2, UInt64.from(0)]
  );

  stater.applyDamage(damageToApply, opponentState);
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
    gameEmitter.throwEffect({
      overlayId: type,
      animationName: 'lightning',
      x: position.x,
      y: position.y,
      scale: 1.2,
    });
  });
};

export class FireBallData extends Struct({
  position: Position,
}) {}

export class FireBallSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: FireBallData,
  })
  implements SpellCast<FireBallData>
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

export const FireBallCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<FireBallData> => {
  return new FireBallSpellCast({
    spellId: CircuitString.fromString('FireBall').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const FireBallModifier = (
  stater: Stater,
  spellCast: SpellCast<FireBallData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  const distance = selfPosition.manhattanDistance(targetPosition);

  const damage = UInt64.from(50);
  const damage2 = UInt64.from(25);
  const damage3 = UInt64.from(15);

  const directHit = distance.equals(UInt64.from(0));
  const nearbyHit = distance.equals(UInt64.from(1));
  const farHit = distance.equals(UInt64.from(2));
  const distantHit = directHit.not().and(nearbyHit.not()).and(farHit.not());

  const damageToApply = Provable.switch(
    [directHit, nearbyHit, farHit, distantHit],
    UInt64,
    [damage, damage2, damage3, UInt64.from(0)]
  );

  stater.applyDamage(damageToApply, opponentState);
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
    gameEmitter.throwEffect({
      overlayId: type,
      animationName: 'fireball',
      x: position.x,
      y: position.y,
      scale: 1.5,
    });
  });
};

export class LaserData extends Struct({
  position: Position,
}) {}

export class LaserSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: LaserData,
  })
  implements SpellCast<LaserData>
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

export const LaserCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<LaserData> => {
  return new LaserSpellCast({
    spellId: CircuitString.fromString('Laser').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const LaserModifier = (
  stater: Stater,
  spellCast: SpellCast<LaserData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  const sameRow = selfPosition.x.equals(targetPosition.x);
  const sameColumn = selfPosition.y.equals(targetPosition.y);
  const hit = sameRow.or(sameColumn);

  const damage = UInt64.from(50);

  const damageToApply = Provable.if(hit, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);
};

const LaserSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  for (let i = 0; i < 8; i++) {
    if (i === y) continue;
    gameEmitter.throwEffect({
      overlayId: type,
      animationName: 'laser_vertical',
      x,
      y: i,
      scale: 1.5,
    });
  }
  for (let i = 0; i < 8; i++) {
    if (i === x) continue;
    gameEmitter.throwEffect({
      overlayId: type,
      animationName: 'laser_horisontal',
      x: i,
      y,
      scale: 1.5,
    });
  }

  gameEmitter.throwEffect({
    overlayId: type,
    animationName: 'laser_center',
    x,
    y,
    scale: 1.5,
  });
};

export class TeleportData extends Struct({
  position: Position,
}) {}

export class TeleportSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: TeleportData,
  })
  implements SpellCast<TeleportData>
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

export const TeleportCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<TeleportData> => {
  return new TeleportSpellCast({
    spellId: CircuitString.fromString('Teleport').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const TeleportModifier = (
  stater: Stater,
  spellCast: SpellCast<TeleportData>,
  opponentState: State
) => {
  stater.state.playerStats.position = new PositionOption({
    value: spellCast.additionalData.position,
    isSome: Field(1),
  });
};

export class HealData extends Struct({}) {}

export class HealSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: HealData,
  })
  implements SpellCast<HealData>
{
  hash(): Field {
    return Poseidon.hash([this.caster, this.spellId, this.target]);
  }
}

export const HealCast = (
  state: State,
  caster: Field,
  target: Field
): SpellCast<HealData> => {
  return new HealSpellCast({
    spellId: CircuitString.fromString('Heal').hash(),
    caster,
    target,
    additionalData: {},
  });
};

export const HealModifier = (
  stater: Stater,
  spellCast: SpellCast<HealData>,
  opponentState: State
) => {
  stater.state.playerStats.hp = stater.state.playerStats.hp.add(Int64.from(50));
  // If the player has more health than the max health, set the health to the max health
  stater.state.playerStats.hp = Provable.if(
    stater.state.playerStats.hp
      .sub(stater.state.playerStats.maxHp)
      .isPositive(),
    stater.state.playerStats.maxHp,
    stater.state.playerStats.hp
  );
};

export const mageSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('LightningBold').hash(),
    wizardId: WizardId.MAGE,
    cooldown: Field(1),
    name: 'Lightning',
    description: 'A powerful bolt of lightning. High one point damage',
    image: '/wizards/skills/lightning.png',
    modifierData: LightningBoldData,
    modifier: LightningBoldModifier,
    spellCast: LightningBoldSpellCast,
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
    image: '/wizards/skills/fireball.png',
    modifierData: FireBallData,
    modifier: FireBallModifier,
    spellCast: FireBallSpellCast,
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
    image: '/wizards/skills/teleport.png',
    modifierData: TeleportData,
    modifier: TeleportModifier,
    spellCast: TeleportSpellCast,
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
    image: '/wizards/skills/heal.png',
    modifierData: HealData,
    modifier: HealModifier,
    spellCast: HealSpellCast,
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
    image: '/wizards/skills/laser.png',
    modifierData: LaserData,
    modifier: LaserModifier,
    spellCast: LaserSpellCast,
    cast: LaserCast,
    target: 'enemy',
    sceneEffect: LaserSceneEffect,
    defaultValue: {
      spellId: CircuitString.fromString('Laser').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
];

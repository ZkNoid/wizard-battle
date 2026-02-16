import { State } from '../state';
import { Effect, Position, type SpellCast } from '../structs';
import {
  Bool,
  CircuitString,
  Field,
  Poseidon,
  Provable,
  Struct,
  UInt64,
  Int64,
} from 'o1js';
import { type ISpell } from './interface';
import { WizardId } from '../../wizards';
import { Stater } from '../stater';

export class ArrowData extends Struct({
  position: Position,
}) {}

export class ArrowSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: ArrowData,
  })
  implements SpellCast<ArrowData>
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

export const ArrowCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<ArrowData> => {
  return new ArrowSpellCast({
    spellId: CircuitString.fromString('Arrow').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const ArrowModifier = (
  stater: Stater,
  spellCast: SpellCast<ArrowData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));

  // Damage
  const damage = UInt64.from(30);

  const damageToApply = Provable.if(directHit, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);

  // Bleeding effect (provable)
  const chance = stater.getRandomPercentage();
  const isBleeding = directHit.and(chance.lessThan(UInt64.from(50)));

  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Bleeding').hash(),
      duration: Field.from(3),
      param: Field(0),
    }),
    'endOfRound',
    isBleeding
  );
};

const ArrowSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'arrow',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const ArrowAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

export class AimingShotData extends Struct({
  position: Position,
}) {}

export class AimingShotSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: AimingShotData,
  })
  implements SpellCast<AimingShotData>
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

export const AimingShotCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<AimingShotData> => {
  return new AimingShotSpellCast({
    spellId: CircuitString.fromString('AimingShot').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const AimingShotModifier = (
  stater: Stater,
  spellCast: SpellCast<AimingShotData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));

  const damage = UInt64.from(100);

  let damageToApply = Provable.if(directHit, damage, UInt64.from(0));

  // #TODO make provable
  // Critical hit

  let randomValue = stater.getRandomPercentage();
  const isCritical = randomValue.lessThan(UInt64.from(10));

  if (isCritical.toBoolean()) {
    damageToApply = damageToApply.mul(UInt64.from(2));
  }

  stater.applyDamage(damageToApply, opponentState);
};

const AimingShotSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'aimingshot',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const AimingShotAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

export class HailOfArrowsData extends Struct({
  position: Position,
}) {}

export class HailOfArrowsSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: HailOfArrowsData,
  })
  implements SpellCast<HailOfArrowsData>
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

export const HailOfArrowsCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<HailOfArrowsData> => {
  return new HailOfArrowsSpellCast({
    spellId: CircuitString.fromString('HailOfArrows').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const HailOfArrowsModifier = (
  stater: Stater,
  spellCast: SpellCast<HailOfArrowsData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const hasDamage = distance.lessThanOrEqual(UInt64.from(3));
  const damageToApply = Provable.if(hasDamage, UInt64.from(50), UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);

  // Slowing effect (provable): -1 speed immediately, restore after 2 turns
  const chance = stater.getRandomPercentage();
  const isSlowing = hasDamage.and(chance.lessThan(UInt64.from(20)));

  const currentSpeed = stater.state.playerStats.speed;
  stater.state.playerStats.speed = Provable.if(
    isSlowing,
    currentSpeed.sub(Int64.from(1)),
    currentSpeed
  );

  // Push restoration as onEndEffect (fires once when duration expires)
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('SlowingRestoration').hash(),
      duration: Field.from(2),
      param: Field(0),
    }),
    'onEnd',
    isSlowing
  );
};

const HailOfArrowsAffectedArea = (x: number, y: number) => {
  return [
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];
};

const HailOfArrowsSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = HailOfArrowsAffectedArea(x, y);

  positions.forEach((position) => {
    gameEmitter.throwEffect({
      animationName: 'hailofarrows',
      x: position.x,
      y: position.y,
      overlayId: type,
      scale: 3,
    });
  });
};

export class DecoyData extends Struct({
  x: Field,
  y: Field,
}) {}

export class DecoySpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: DecoyData,
  })
  implements SpellCast<DecoyData>
{
  hash(): Field {
    return Poseidon.hash([
      this.caster,
      this.spellId,
      this.target,
      this.additionalData.x,
      this.additionalData.y,
    ]);
  }
}

export const DecoyCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<DecoyData> => {
  return new DecoySpellCast({
    spellId: CircuitString.fromString('Decoy').hash(),
    caster,
    target,
    additionalData: new DecoyData({
      x: position.x.toField(),
      y: position.y.toField(),
    }),
  });
};

export const DecoyModifier = (
  stater: Stater,
  spellCast: SpellCast<DecoyData>,
  opponentState: State
) => {
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Decoy').hash(),
      duration: Field.from(2),
      param: Field(spellCast.additionalData.x.toBigInt() + spellCast.additionalData.y.toBigInt() * 8n),
    }),
    'public',
    Bool(true)
  );
};

export class CloudData extends Struct({
  position: Position,
}) {}

export class CloudSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: CloudData,
  })
  implements SpellCast<CloudData>
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

export const CloudCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<CloudData> => {
  return new CloudSpellCast({
    spellId: CircuitString.fromString('Cloud').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const CloudModifier = (
  stater: Stater,
  spellCast: SpellCast<CloudData>,
  opponentState: State
) => {
  console.log('Cloud modifier');
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Cloud').hash(),
      duration: Field.from(3),
      param: Field(
        spellCast.additionalData.position.x.toBigint() +
          spellCast.additionalData.position.y.toBigint() * 8n
      ),
    }),
    'public',
    Bool(true)
  );
};

const CloudAffectedArea = (x: number, y: number) => {
  return [
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
};

const CloudSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = CloudAffectedArea(x, y);

  let effectsId: any = [];

  positions.forEach((position) => {
    let effectId = gameEmitter.throwEffect({
      animationName: 'smokecloud',
      x: position.x,
      y: position.y,
      overlayId: type,
      loop: true,
      scale: 1.5,
    });
    effectsId.push(effectId);
  });

  let duration = 3;

  return () => {
    if (duration > 0) {
      duration--;
    } else {
      effectsId.forEach((effectId: any) => {
        gameEmitter.removeEffect(effectId);
      });
    }
  };
};

export const archerSpells: ISpell<any>[] = [
  {
    id: CircuitString.fromString('Arrow').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'Arrow',
    description: 'A single arrow shot',
    image: '/wizards/skills/arrow.png',
    modifierData: ArrowData,
    modifier: ArrowModifier,
    spellCast: ArrowSpellCast,
    cast: ArrowCast,
    sceneEffect: ArrowSceneEffect,
    affectedArea: ArrowAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('Arrow').hash(),
      cooldown: Int64.from(1),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('AimingShot').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'AimingShot',
    description: 'A shot with a higher chance of critical hit',
    image: '/wizards/skills/aimingShot.png',
    modifierData: AimingShotData,
    modifier: AimingShotModifier,
    spellCast: AimingShotSpellCast,
    sceneEffect: AimingShotSceneEffect,
    affectedArea: AimingShotAffectedArea,
    cast: AimingShotCast,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('AimingShot').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('HailOfArrows').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'HailOfArrows',
    description: 'A hail of arrows',
    image: '/wizards/skills/hailOfArrows.png',
    modifierData: HailOfArrowsData,
    modifier: HailOfArrowsModifier,
    spellCast: HailOfArrowsSpellCast,
    cast: HailOfArrowsCast,
    sceneEffect: HailOfArrowsSceneEffect,
    affectedArea: HailOfArrowsAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('HailOfArrows').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Decoy').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'Decoy',
    description: 'Create a decoy',
    image: '/wizards/skills/decoy.png',
    modifierData: DecoyData,
    modifier: DecoyModifier,
    spellCast: DecoySpellCast,
    cast: DecoyCast,
    target: 'ally',
    defaultValue: {
      spellId: CircuitString.fromString('Decoy').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('Cloud').hash(),
    wizardId: WizardId.ARCHER,
    cooldown: Field(1),
    name: 'Cloud',
    description: 'Create a cloud',
    image: '/wizards/skills/smokeCloud.png',
    modifierData: CloudData,
    modifier: CloudModifier,
    spellCast: CloudSpellCast,
    cast: CloudCast,
    sceneEffect: CloudSceneEffect,
    affectedArea: CloudAffectedArea,
    target: 'ally',
    globalStatus: 'global',
    defaultValue: {
      spellId: CircuitString.fromString('Cloud').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
  },
];

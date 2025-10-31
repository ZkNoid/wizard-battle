import { State } from '../state';
import { Effect, Position, type SpellCast } from '../structs';
import {
  CircuitString,
  Field,
  Int64,
  Poseidon,
  Provable,
  Struct,
  UInt64,
} from 'o1js';
import { type ISpell } from './interface';
import { WizardId } from '../../wizards';

export class ArrowData extends Struct({
  position: Position,
}) {}

export const ArrowCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<ArrowData> => {
  return {
    spellId: CircuitString.fromString('Arrow').hash(),
    caster,
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

  // Damage
  const damage = Int64.from(30);

  const damageToApply = Provable.if(directHit, damage, Int64.from(0));

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);

  // #TODO make provable
  // Bleeding effect

  const chance = Poseidon.hash([state.randomSeed]).toBigInt() % 2n;
  const isBleeding = directHit.toBoolean() && chance === 1n;

  if (isBleeding) {
    state.pushEffect(
      new Effect({
        effectId: CircuitString.fromString('Bleeding').hash(),
        duration: Field.from(3),
        param: Field(0),
      }),
      'endOfRound'
    );
  }
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

export class AimingShotData extends Struct({
  position: Position,
}) {}

export const AimingShotCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<AimingShotData> => {
  return {
    spellId: CircuitString.fromString('AimingShot').hash(),
    caster,
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

export class HailOfArrowsData extends Struct({
  position: Position,
}) {}

export const HailOfArrowsCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<HailOfArrowsData> => {
  return {
    spellId: CircuitString.fromString('HailOfArrows').hash(),
    caster,
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
  const hasDamage = distance.lessThanOrEqual(UInt64.from(3));
  const damageToApply = Provable.if(hasDamage, Int64.from(50), Int64.from(0));

  state.playerStats.hp = state.playerStats.hp.sub(damageToApply);

  // #TODO make provable
  // Slowing effect

  const chance = Poseidon.hash([state.randomSeed]).toBigInt() % 10n;
  const isSlowing = hasDamage.toBoolean() && chance <= 2n;

  if (isSlowing) {
    state.pushEffect(
      new Effect({
        effectId: CircuitString.fromString('SlowingRestoration').hash(),
        duration: Field.from(3),
        param: Field(0),
      }),
      'endOfRound'
    );
    state.pushEffect(
      new Effect({
        effectId: CircuitString.fromString('Slowing').hash(),
        duration: Field.from(2),
        param: Field(0),
      }),
      'endOfRound'
    );
  }
};

const HailOfArrowsSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  let positions = [
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];

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

export class DecoyData extends Struct({}) {}

export const DecoyCast = (
  state: State,
  caster: Field,
  target: Field
): SpellCast<DecoyData> => {
  return {
    spellId: CircuitString.fromString('Decoy').hash(),
    caster,
    target,
    additionalData: {},
  };
};

export const DecoyModifyer = (
  state: State,
  spellCast: SpellCast<DecoyData>
) => {
  state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Decoy').hash(),
      duration: Field.from(2),
      param: Field(0),
    }),
    'public'
  );
};

export class CloudData extends Struct({
  position: Position,
}) {}

export const CloudCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<CloudData> => {
  return {
    spellId: CircuitString.fromString('Cloud').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  };
};

export const CloudModifyer = (
  state: State,
  spellCast: SpellCast<CloudData>
) => {
  console.log('Cloud modifyer');
  state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Cloud').hash(),
      duration: Field.from(3),
      param: Field(
        spellCast.additionalData.position.x.toBigint() +
          spellCast.additionalData.position.y.toBigint() * 8n
      ),
    }),
    'public'
  );
};

const CloudSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  let positions = [
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
    modifyerData: ArrowData,
    modifyer: ArrowModifyer,
    cast: ArrowCast,
    sceneEffect: ArrowSceneEffect,
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
    modifyerData: AimingShotData,
    modifyer: AimingShotModifyer,
    sceneEffect: AimingShotSceneEffect,
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
    modifyerData: HailOfArrowsData,
    modifyer: HailOfArrowsModifyer,
    cast: HailOfArrowsCast,
    sceneEffect: HailOfArrowsSceneEffect,
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
    modifyerData: DecoyData,
    modifyer: DecoyModifyer,
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
    modifyerData: CloudData,
    modifyer: CloudModifyer,
    cast: CloudCast,
    sceneEffect: CloudSceneEffect,
    target: 'ally',
    globalStatus: 'global',
    defaultValue: {
      spellId: CircuitString.fromString('Cloud').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
  },
];

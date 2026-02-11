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
import { PositionOption } from '../structs';

// ============================================================================
// SPECTRAL ARROW - Basic projectile attack
// Deal 50 damage to 1x1 area
// ============================================================================

export class SpectralArrowData extends Struct({
  position: Position,
}) {}

export class SpectralArrowSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: SpectralArrowData,
  })
  implements SpellCast<SpectralArrowData>
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

export const SpectralArrowCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<SpectralArrowData> => {
  return new SpectralArrowSpellCast({
    spellId: CircuitString.fromString('SpectralArrow').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const SpectralArrowModifier = (
  stater: Stater,
  spellCast: SpellCast<SpectralArrowData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));

  const damage = UInt64.from(50);
  const damageToApply = Provable.if(directHit, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);
};

const SpectralArrowSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'spectral_arrow',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const SpectralArrowAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

// ============================================================================
// SHADOW VEIL - Become invisible for 2 turns
// Next attack deals +50% damage and reveals the duelist
// ============================================================================

export class ShadowVeilData extends Struct({}) {}

export class ShadowVeilSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: ShadowVeilData,
  })
  implements SpellCast<ShadowVeilData>
{
  hash(): Field {
    return Poseidon.hash([this.caster, this.spellId, this.target]);
  }
}

export const ShadowVeilCast = (
  state: State,
  caster: Field,
  target: Field
): SpellCast<ShadowVeilData> => {
  return new ShadowVeilSpellCast({
    spellId: CircuitString.fromString('ShadowVeil').hash(),
    caster,
    target,
    additionalData: {},
  });
};

const ShadowVeilSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'shadow_veil',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const ShadowVeilAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

export const ShadowVeilModifier = (
  stater: Stater,
  spellCast: SpellCast<ShadowVeilData>,
  opponentState: State
) => {
  // Apply invisibility effect for 2 turns
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('ShadowVeilInvisible').hash(),
      duration: Field.from(2),
      param: Field(0),
    }),
    'public',
    Bool(true)
  );

  // Apply damage boost effect for next attack (+50% damage)
  // TODO: Implement this
  //   stater.state.pushEffect(
  //     new Effect({
  //       effectId: CircuitString.fromString('ShadowVeilDamageBoost').hash(),
  //       duration: Field.from(2),
  //       param: Field(50), // 50% bonus damage
  //     }),
  //     'endOfRound'
  //   );
};

// ============================================================================
// SPECTRAL PROJECTION - Create a spectral projection on opponent's field
// For 3 turns, transforms skills into melee variants
// ============================================================================

export class SpectralProjectionData extends Struct({
  position: Position,
}) {}

export class SpectralProjectionSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: SpectralProjectionData,
  })
  implements SpellCast<SpectralProjectionData>
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

export const SpectralProjectionCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<SpectralProjectionData> => {
  return new SpectralProjectionSpellCast({
    spellId: CircuitString.fromString('SpectralProjection').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const SpectralProjectionModifier = (
  stater: Stater,
  spellCast: SpellCast<SpectralProjectionData>,
  opponentState: State
) => {
  // Skill transformation mappings:
  // - Spectral Arrow → Shadow Strike
  // - Dusk's Embrace → Shadow Dash
  // - Phantom Echo → Whirling Blades
  const spectralArrowId = CircuitString.fromString('SpectralArrow').hash();
  const shadowStrikeId = CircuitString.fromString('ShadowStrike').hash();
  const dusksEmbraceId = CircuitString.fromString('DusksEmbrace').hash();
  const shadowDashId = CircuitString.fromString('ShadowDash').hash();
  const phantomEchoId = CircuitString.fromString('PhantomEcho').hash();
  const whirlingBladesId = CircuitString.fromString('WhirlingBlades').hash();

  // Transform skills in a provable way using Provable.switch
  for (let i = 0; i < stater.state.spellStats.length; i++) {
    const currentSpellId = stater.state.spellStats[i]!.spellId;

    // Check each condition for transformation
    const isSpectralArrow = currentSpellId.equals(spectralArrowId);
    const isDusksEmbrace = currentSpellId.equals(dusksEmbraceId);
    const isPhantomEcho = currentSpellId.equals(phantomEchoId);
    const isOther = isSpectralArrow.or(isDusksEmbrace).or(isPhantomEcho).not();

    // Use Provable.switch to select the transformed spell ID
    const finalSpellId = Provable.switch(
      [isSpectralArrow, isDusksEmbrace, isPhantomEcho, isOther],
      Field,
      [shadowStrikeId, shadowDashId, whirlingBladesId, currentSpellId]
    );

    stater.state.spellStats[i]!.spellId = finalSpellId;
  }

  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('SpectralProjectionReturn').hash(),
      duration: Field.from(3),
      param: Field(0),
    }),
    'onEnd',
    Bool(true)
  );
};

const SpectralProjectionAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

// ============================================================================
// DUSK'S EMBRACE - Deal 50 damage to horizontal line
// Apply Weaken (-30% Defence) for 2 turns if hit
// ============================================================================

export class DusksEmbraceData extends Struct({
  position: Position,
}) {}

export class DusksEmbraceSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: DusksEmbraceData,
  })
  implements SpellCast<DusksEmbraceData>
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

export const DusksEmbraceCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<DusksEmbraceData> => {
  return new DusksEmbraceSpellCast({
    spellId: CircuitString.fromString('DusksEmbrace').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const DusksEmbraceModifier = (
  stater: Stater,
  spellCast: SpellCast<DusksEmbraceData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  // Hit if on same horizontal line (same y coordinate)
  const sameRow = selfPosition.y.equals(targetPosition.y);
  const damage = UInt64.from(50);
  const damageToApply = Provable.if(sameRow, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);

  // Apply Weaken effect if hit (provable)
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Weaken').hash(),
      duration: Field.from(2),
      param: Field(30), // -30% defence
    }),
    'endOfRound',
    sameRow
  );
};

const DusksEmbraceAffectedArea = (x: number, y: number) => {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    positions.push({ x: i, y });
  }
  return positions;
};

const DusksEmbraceSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  // Draw horizontal line effect across the entire row
  const positions = DusksEmbraceAffectedArea(x, y);
  positions.forEach((position) => {
    gameEmitter.throwEffect({
      animationName: 'dusks_embrace',
      x: position.x,
      y: position.y,
      overlayId: type,
      scale: 1.5,
    });
  });
};

// ============================================================================
// PHANTOM ECHO - Deal 30 damage to Diamond 3x3 area
// If hit, opponent becomes visible and takes +50% damage for 1 turn
// ============================================================================

export class PhantomEchoData extends Struct({
  position: Position,
}) {}

export class PhantomEchoSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: PhantomEchoData,
  })
  implements SpellCast<PhantomEchoData>
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

export const PhantomEchoCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<PhantomEchoData> => {
  return new PhantomEchoSpellCast({
    spellId: CircuitString.fromString('PhantomEcho').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const PhantomEchoModifier = (
  stater: Stater,
  spellCast: SpellCast<PhantomEchoData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  // Diamond 3x3 means manhattan distance <= 1 from center
  const distance = selfPosition.manhattanDistance(targetPosition);
  const isInDiamond = distance.lessThanOrEqual(UInt64.from(1));

  const damage = UInt64.from(30);
  const damageToApply = Provable.if(isInDiamond, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);

  // If hit, apply visibility and vulnerability effects (provable)
  // Remove invisibility / make visible
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Revealed').hash(),
      duration: Field.from(1),
      param: Field(0),
    }),
    'public',
    isInDiamond
  );

  // Apply vulnerability (+50% damage taken)
  stater.state.pushEffect(
    new Effect({
      effectId: CircuitString.fromString('Vulnerable').hash(),
      duration: Field.from(1),
      param: Field(50), // +50% damage taken
    }),
    'endOfRound',
    isInDiamond
  );
};

const PhantomEchoAffectedArea = (x: number, y: number) => {
  // Diamond 3x3 pattern (manhattan distance <= 1)
  return [
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];
};

const PhantomEchoSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = PhantomEchoAffectedArea(x, y);

  positions.forEach((position) => {
    gameEmitter.throwEffect({
      animationName: 'phantom_echo',
      x: position.x,
      y: position.y,
      overlayId: type,
      scale: 1.5,
    });
  });
};

// ============================================================================
// SHADOW STRIKE (Spectral Form) - Deal 50 damage with +20% crit chance
// Melee attack, 1x1 area
// ============================================================================

export class ShadowStrikeData extends Struct({
  position: Position,
}) {}

export class ShadowStrikeSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: ShadowStrikeData,
  })
  implements SpellCast<ShadowStrikeData>
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

export const ShadowStrikeCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<ShadowStrikeData> => {
  return new ShadowStrikeSpellCast({
    spellId: CircuitString.fromString('ShadowStrike').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const ShadowStrikeModifier = (
  stater: Stater,
  spellCast: SpellCast<ShadowStrikeData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;
  const distance = selfPosition.manhattanDistance(targetPosition);
  const directHit = distance.equals(UInt64.from(0));

  let damage = UInt64.from(50);

  // +20% critical hit chance
  const chance = stater.getRandomPercentage();
  // Base crit + 20% bonus = check if random < 20
  const isCritical = chance.lessThan(UInt64.from(20));

  damage = Provable.if(
    isCritical,
    damage.mul(UInt64.from(2)), // Critical hits deal double damage
    damage
  );

  const damageToApply = Provable.if(directHit, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);
};

const ShadowStrikeSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'shadow_strike',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const ShadowStrikeAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

// ============================================================================
// SHADOW DASH (Spectral Form) - Dash at opponent
// Deal up to +100% extra damage depending on distance
// ============================================================================

export class ShadowDashData extends Struct({
  position: Position,
}) {}

export class ShadowDashSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: ShadowDashData,
  })
  implements SpellCast<ShadowDashData>
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

export const ShadowDashCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<ShadowDashData> => {
  return new ShadowDashSpellCast({
    spellId: CircuitString.fromString('ShadowDash').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const ShadowDashModifier = (
  stater: Stater,
  spellCast: SpellCast<ShadowDashData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const casterPosition = opponentState.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  // Calculate distance from caster to target for damage scaling
  const distance = casterPosition.manhattanDistance(selfPosition);
  const directHit = selfPosition
    .manhattanDistance(targetPosition)
    .equals(UInt64.from(0));

  // Base damage 50, up to +100% based on distance (max at distance 7)
  const baseDamage = UInt64.from(50);

  // Scale damage based on distance: 50 + (distance/7 * 50) = 50 to 100 damage
  // bonusDamage = min(distance * 50 / 7, 50)
  const scaledDistance = distance.mul(UInt64.from(50));
  const rawBonusDamage = scaledDistance.div(UInt64.from(7));
  const maxBonus = UInt64.from(50);
  const isCapped = rawBonusDamage.greaterThan(maxBonus);
  const bonusDamage = Provable.if(isCapped, maxBonus, rawBonusDamage);
  const totalDamage = baseDamage.add(bonusDamage);

  const damageToApply = Provable.if(directHit, totalDamage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);
};

const ShadowDashSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  gameEmitter.throwEffect({
    animationName: 'shadow_dash',
    x,
    y,
    overlayId: type,
    scale: 1.5,
  });
};

const ShadowDashAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

/** Returns all positions in a cross pattern (horizontal and vertical) from the caster's position */
const ShadowDashCastedArea = (x: number, y: number) => {
  const positions: { x: number; y: number }[] = [];
  // Horizontal positions (same row)
  for (let i = 0; i < 8; i++) {
    if (i !== x) {
      positions.push({ x: i, y });
    }
  }
  // Vertical positions (same column)
  for (let j = 0; j < 8; j++) {
    if (j !== y) {
      positions.push({ x, y: j });
    }
  }
  return positions;
};

// ============================================================================
// SHADOW DASH MOVE (Spectral Form) - Companion spell to update caster position
// Cast on self to move to the dash target position
// ============================================================================

export class ShadowDashMoveData extends Struct({
  position: Position,
}) {}

export class ShadowDashMoveSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: ShadowDashMoveData,
  })
  implements SpellCast<ShadowDashMoveData>
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

export const ShadowDashMoveCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<ShadowDashMoveData> => {
  return new ShadowDashMoveSpellCast({
    spellId: CircuitString.fromString('ShadowDashMove').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const ShadowDashMoveModifier = (
  stater: Stater,
  spellCast: SpellCast<ShadowDashMoveData>,
  opponentState: State
) => {
  const targetPosition = spellCast.additionalData.position;

  // Update caster's position to the dash target
  stater.state.playerStats.position = new PositionOption({
    value: targetPosition,
    isSome: Field(1),
  });
};

const ShadowDashMoveSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  // The visual dash effect is handled by ShadowDash, this is just the position update
  gameEmitter.throwEffect({
    animationName: 'shadow_dash_move',
    x,
    y,
    overlayId: type,
    scale: 1.0,
  });
};

const ShadowDashMoveAffectedArea = (x: number, y: number) => {
  return [{ x, y }];
};

// ============================================================================
// WHIRLING BLADES (Spectral Form) - Deal 50 damage to 3x3 area
// ============================================================================

export class WhirlingBladesData extends Struct({
  position: Position,
}) {}

export class WhirlingBladesSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: WhirlingBladesData,
  })
  implements SpellCast<WhirlingBladesData>
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

export const WhirlingBladesCast = (
  state: State,
  caster: Field,
  target: Field,
  position: Position
): SpellCast<WhirlingBladesData> => {
  return new WhirlingBladesSpellCast({
    spellId: CircuitString.fromString('WhirlingBlades').hash(),
    caster,
    target,
    additionalData: {
      position,
    },
  });
};

export const WhirlingBladesModifier = (
  stater: Stater,
  spellCast: SpellCast<WhirlingBladesData>,
  opponentState: State
) => {
  const selfPosition = stater.state.playerStats.position.value;
  const targetPosition = spellCast.additionalData.position;

  // 3x3 area = Chebyshev distance <= 1 (or manhattan distance <= 2 with diagonal consideration)
  // Using max of absolute x and y difference
  const xDiff = selfPosition.x.sub(targetPosition.x).magnitude;
  const yDiff = selfPosition.y.sub(targetPosition.y).magnitude;

  // Check if within 3x3 (Chebyshev distance of 1)
  const inXRange = xDiff.lessThanOrEqual(UInt64.from(1));
  const inYRange = yDiff.lessThanOrEqual(UInt64.from(1));
  const isInArea = inXRange.and(inYRange);

  const damage = UInt64.from(50);
  const damageToApply = Provable.if(isInArea, damage, UInt64.from(0));

  stater.applyDamage(damageToApply, opponentState);
};

const WhirlingBladesAffectedArea = (x: number, y: number) => {
  // 3x3 area centered on target
  return [
    { x: x - 1, y: y - 1 },
    { x: x, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y },
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y + 1 },
    { x: x, y: y + 1 },
    { x: x + 1, y: y + 1 },
  ];
};

/** Returns only the caster's position - spell can only be cast on self */
const WhirlingBladesCastedArea = (x: number, y: number) => {
  return [{ x, y }];
};

const WhirlingBladesSceneEffect = (
  x: number,
  y: number,
  gameEmitter: any,
  type: 'user' | 'enemy'
) => {
  const positions = WhirlingBladesAffectedArea(x, y);

  positions.forEach((position) => {
    gameEmitter.throwEffect({
      animationName: 'whirling_blades',
      x: position.x,
      y: position.y,
      overlayId: type,
      scale: 1.5,
    });
  });
};

// ============================================================================
// PHANTOM DUELIST SPELLS EXPORT
// Note: Phantom Armor is a passive ability and should be handled in default state
// ============================================================================

export const phantomDuelistSpells: ISpell<any>[] = [
  // === REGULAR SKILLS ===
  {
    id: CircuitString.fromString('SpectralArrow').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(1),
    name: 'SpectralArrow',
    description: 'Deal 50 damage to a single target.',
    image: '/wizards/skills/spectralArrow.png',
    modifierData: SpectralArrowData,
    modifier: SpectralArrowModifier,
    spellCast: SpectralArrowSpellCast,
    cast: SpectralArrowCast,
    sceneEffect: SpectralArrowSceneEffect,
    affectedArea: SpectralArrowAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('SpectralArrow').hash(),
      cooldown: Int64.from(1),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('ShadowVeil').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(5),
    name: 'ShadowVeil',
    description:
      'Become invisible for 2 turns. Next attack deals +50% damage and reveals you.',
    image: '/wizards/skills/shadowVeil.png',
    modifierData: ShadowVeilData,
    modifier: ShadowVeilModifier,
    spellCast: ShadowVeilSpellCast,
    cast: ShadowVeilCast,
    sceneEffect: ShadowVeilSceneEffect,
    affectedArea: ShadowVeilAffectedArea,
    target: 'ally',
    priority: 1,
    defaultValue: {
      spellId: CircuitString.fromString('ShadowVeil').hash(),
      cooldown: Int64.from(5),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('SpectralProjection').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(6),
    name: 'SpectralProjection',
    description:
      "Create a spectral projection on opponent's field for 3 turns, transforming skills into melee variants.",
    image: '/wizards/skills/spectralProjection.png',
    modifierData: SpectralProjectionData,
    modifier: SpectralProjectionModifier,
    spellCast: SpectralProjectionSpellCast,
    cast: SpectralProjectionCast,
    affectedArea: SpectralProjectionAffectedArea,
    target: 'ally',
    priority: 1,
    defaultValue: {
      spellId: CircuitString.fromString('SpectralProjection').hash(),
      cooldown: Int64.from(6),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('DusksEmbrace').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(2),
    name: 'DusksEmbrace',
    description:
      'Deal 50 damage to a horizontal line and apply Weaken (-30% Defence) for 2 turns if hit.',
    image: '/wizards/skills/dusksEmbrace.png',
    modifierData: DusksEmbraceData,
    modifier: DusksEmbraceModifier,
    spellCast: DusksEmbraceSpellCast,
    cast: DusksEmbraceCast,
    sceneEffect: DusksEmbraceSceneEffect,
    affectedArea: DusksEmbraceAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('DusksEmbrace').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
  },
  {
    id: CircuitString.fromString('PhantomEcho').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(3),
    name: 'PhantomEcho',
    description:
      'Deal 30 damage to a diamond 3x3 area. If hit, opponent becomes visible and takes +50% damage for 1 turn.',
    image: '/wizards/skills/phantomEcho.png',
    modifierData: PhantomEchoData,
    modifier: PhantomEchoModifier,
    spellCast: PhantomEchoSpellCast,
    cast: PhantomEchoCast,
    sceneEffect: PhantomEchoSceneEffect,
    affectedArea: PhantomEchoAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('PhantomEcho').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
  },
  // === SPECTRAL FORM SKILLS (Melee variants) ===
  {
    id: CircuitString.fromString('ShadowStrike').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(1),
    name: 'ShadowStrike',
    description: 'Deal 50 damage with +20% critical chance. (Spectral Form)',
    image: '/wizards/skills/shadowStrike.png',
    modifierData: ShadowStrikeData,
    modifier: ShadowStrikeModifier,
    spellCast: ShadowStrikeSpellCast,
    cast: ShadowStrikeCast,
    sceneEffect: ShadowStrikeSceneEffect,
    affectedArea: ShadowStrikeAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('ShadowStrike').hash(),
      cooldown: Int64.from(1),
      currentCooldown: Int64.from(0),
    },
    hidden: true,
  },
  {
    id: CircuitString.fromString('ShadowDash').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(2),
    name: 'ShadowDash',
    description:
      'Dash at opponent dealing up to +100% extra damage depending on distance. (Spectral Form)',
    image: '/wizards/skills/shadowDash.png',
    modifierData: ShadowDashData,
    modifier: ShadowDashModifier,
    spellCast: ShadowDashSpellCast,
    cast: ShadowDashCast,
    sceneEffect: ShadowDashSceneEffect,
    affectedArea: ShadowDashAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('ShadowDash').hash(),
      cooldown: Int64.from(2),
      currentCooldown: Int64.from(0),
    },
    hidden: true,
    companionSpellId: CircuitString.fromString('ShadowDashMove').hash(),
    castedArea: ShadowDashCastedArea,
  },
  {
    id: CircuitString.fromString('ShadowDashMove').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(0),
    name: 'ShadowDashMove',
    description:
      'Move to dash target position. (Companion spell for ShadowDash)',
    image: '/wizards/skills/shadowDash.png',
    modifierData: ShadowDashMoveData,
    modifier: ShadowDashMoveModifier,
    spellCast: ShadowDashMoveSpellCast,
    cast: ShadowDashMoveCast,
    sceneEffect: ShadowDashMoveSceneEffect,
    affectedArea: ShadowDashMoveAffectedArea,
    target: 'ally',
    defaultValue: {
      spellId: CircuitString.fromString('ShadowDashMove').hash(),
      cooldown: Int64.from(0),
      currentCooldown: Int64.from(0),
    },
    hidden: true,
  },
  {
    id: CircuitString.fromString('WhirlingBlades').hash(),
    wizardId: WizardId.PHANTOM_DUELIST,
    cooldown: Field(3),
    name: 'WhirlingBlades',
    description: 'Deal 50 damage to a 3x3 area. (Spectral Form)',
    image: '/wizards/skills/whirlingBlades.png',
    modifierData: WhirlingBladesData,
    modifier: WhirlingBladesModifier,
    spellCast: WhirlingBladesSpellCast,
    cast: WhirlingBladesCast,
    sceneEffect: WhirlingBladesSceneEffect,
    affectedArea: WhirlingBladesAffectedArea,
    target: 'enemy',
    defaultValue: {
      spellId: CircuitString.fromString('WhirlingBlades').hash(),
      cooldown: Int64.from(3),
      currentCooldown: Int64.from(0),
    },
    hidden: true,
    castedArea: WhirlingBladesCastedArea,
  },
];

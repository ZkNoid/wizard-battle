"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phantomDuelistSpells = exports.WhirlingBladesModifier = exports.WhirlingBladesCast = exports.WhirlingBladesSpellCast = exports.WhirlingBladesData = exports.ShadowDashMoveModifier = exports.ShadowDashMoveCast = exports.ShadowDashMoveSpellCast = exports.ShadowDashMoveData = exports.ShadowDashModifier = exports.ShadowDashCast = exports.ShadowDashSpellCast = exports.ShadowDashData = exports.ShadowStrikeModifier = exports.ShadowStrikeCast = exports.ShadowStrikeSpellCast = exports.ShadowStrikeData = exports.PhantomEchoModifier = exports.PhantomEchoCast = exports.PhantomEchoSpellCast = exports.PhantomEchoData = exports.DusksEmbraceModifier = exports.DusksEmbraceCast = exports.DusksEmbraceSpellCast = exports.DusksEmbraceData = exports.SpectralProjectionModifier = exports.SpectralProjectionCast = exports.SpectralProjectionSpellCast = exports.SpectralProjectionData = exports.ShadowVeilModifier = exports.ShadowVeilCast = exports.ShadowVeilSpellCast = exports.ShadowVeilData = exports.SpectralArrowModifier = exports.SpectralArrowCast = exports.SpectralArrowSpellCast = exports.SpectralArrowData = void 0;
const structs_1 = require("../structs");
const o1js_1 = require("o1js");
const wizards_1 = require("../../wizards");
const structs_2 = require("../structs");
// ============================================================================
// SPECTRAL ARROW - Basic projectile attack
// Deal 50 damage to 1x1 area
// ============================================================================
class SpectralArrowData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.SpectralArrowData = SpectralArrowData;
class SpectralArrowSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: SpectralArrowData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.SpectralArrowSpellCast = SpectralArrowSpellCast;
const SpectralArrowCast = (state, caster, target, position) => {
    return new SpectralArrowSpellCast({
        spellId: o1js_1.CircuitString.fromString('SpectralArrow').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.SpectralArrowCast = SpectralArrowCast;
const SpectralArrowModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    const damage = o1js_1.UInt64.from(50);
    const damageToApply = o1js_1.Provable.if(directHit, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
};
exports.SpectralArrowModifier = SpectralArrowModifier;
const SpectralArrowSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'spectral_arrow',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const SpectralArrowAffectedArea = (x, y) => {
    return [{ x, y }];
};
// ============================================================================
// SHADOW VEIL - Become invisible for 2 turns
// Next attack deals +50% damage and reveals the duelist
// ============================================================================
class ShadowVeilData extends (0, o1js_1.Struct)({}) {
}
exports.ShadowVeilData = ShadowVeilData;
class ShadowVeilSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: ShadowVeilData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([this.caster, this.spellId, this.target]);
    }
}
exports.ShadowVeilSpellCast = ShadowVeilSpellCast;
const ShadowVeilCast = (state, caster, target) => {
    return new ShadowVeilSpellCast({
        spellId: o1js_1.CircuitString.fromString('ShadowVeil').hash(),
        caster,
        target,
        additionalData: {},
    });
};
exports.ShadowVeilCast = ShadowVeilCast;
const ShadowVeilSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'shadow_veil',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const ShadowVeilAffectedArea = (x, y) => {
    return [{ x, y }];
};
const ShadowVeilModifier = (stater, spellCast, opponentState) => {
    // Apply invisibility effect for 2 turns
    stater.state.pushEffect(new structs_1.Effect({
        effectId: (0, o1js_1.Field)(1), // Use default invisibility effect
        duration: o1js_1.Field.from(2),
        param: (0, o1js_1.Field)(0),
    }), 'public', (0, o1js_1.Bool)(true));
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
exports.ShadowVeilModifier = ShadowVeilModifier;
// ============================================================================
// SPECTRAL PROJECTION - Create a spectral projection on opponent's field
// For 3 turns, transforms skills into melee variants
// ============================================================================
class SpectralProjectionData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.SpectralProjectionData = SpectralProjectionData;
class SpectralProjectionSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: SpectralProjectionData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.SpectralProjectionSpellCast = SpectralProjectionSpellCast;
const SpectralProjectionCast = (state, caster, target, position) => {
    return new SpectralProjectionSpellCast({
        spellId: o1js_1.CircuitString.fromString('SpectralProjection').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.SpectralProjectionCast = SpectralProjectionCast;
const SpectralProjectionModifier = (stater, spellCast, opponentState) => {
    // Skill transformation mappings:
    // - Spectral Arrow → Shadow Strike
    // - Dusk's Embrace → Shadow Dash
    // - Phantom Echo → Whirling Blades
    const spectralArrowId = o1js_1.CircuitString.fromString('SpectralArrow').hash();
    const shadowStrikeId = o1js_1.CircuitString.fromString('ShadowStrike').hash();
    const dusksEmbraceId = o1js_1.CircuitString.fromString('DusksEmbrace').hash();
    const shadowDashId = o1js_1.CircuitString.fromString('ShadowDash').hash();
    const phantomEchoId = o1js_1.CircuitString.fromString('PhantomEcho').hash();
    const whirlingBladesId = o1js_1.CircuitString.fromString('WhirlingBlades').hash();
    // Transform skills in a provable way using Provable.switch
    for (let i = 0; i < stater.state.spellStats.length; i++) {
        const currentSpellId = stater.state.spellStats[i].spellId;
        // Check each condition for transformation
        const isSpectralArrow = currentSpellId.equals(spectralArrowId);
        const isDusksEmbrace = currentSpellId.equals(dusksEmbraceId);
        const isPhantomEcho = currentSpellId.equals(phantomEchoId);
        const isOther = isSpectralArrow.or(isDusksEmbrace).or(isPhantomEcho).not();
        // Use Provable.switch to select the transformed spell ID
        const finalSpellId = o1js_1.Provable.switch([isSpectralArrow, isDusksEmbrace, isPhantomEcho, isOther], o1js_1.Field, [shadowStrikeId, shadowDashId, whirlingBladesId, currentSpellId]);
        stater.state.spellStats[i].spellId = finalSpellId;
    }
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('SpectralProjectionReturn').hash(),
        duration: o1js_1.Field.from(3),
        param: (0, o1js_1.Field)(0),
    }), 'onEnd', (0, o1js_1.Bool)(true));
};
exports.SpectralProjectionModifier = SpectralProjectionModifier;
const SpectralProjectionAffectedArea = (x, y) => {
    return [{ x, y }];
};
// ============================================================================
// DUSK'S EMBRACE - Deal 50 damage to horizontal line
// Apply Weaken (-30% Defence) for 2 turns if hit
// ============================================================================
class DusksEmbraceData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.DusksEmbraceData = DusksEmbraceData;
class DusksEmbraceSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: DusksEmbraceData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.DusksEmbraceSpellCast = DusksEmbraceSpellCast;
const DusksEmbraceCast = (state, caster, target, position) => {
    return new DusksEmbraceSpellCast({
        spellId: o1js_1.CircuitString.fromString('DusksEmbrace').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.DusksEmbraceCast = DusksEmbraceCast;
const DusksEmbraceModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    // Hit if on same horizontal line (same y coordinate)
    const sameRow = selfPosition.y.equals(targetPosition.y);
    const damage = o1js_1.UInt64.from(50);
    const damageToApply = o1js_1.Provable.if(sameRow, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
    // Apply Weaken effect if hit (provable)
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Weaken').hash(),
        duration: o1js_1.Field.from(2),
        param: (0, o1js_1.Field)(30), // -30% defence
    }), 'endOfRound', sameRow);
};
exports.DusksEmbraceModifier = DusksEmbraceModifier;
const DusksEmbraceAffectedArea = (x, y) => {
    const positions = [];
    for (let i = 0; i < 8; i++) {
        positions.push({ x: i, y });
    }
    return positions;
};
const DusksEmbraceSceneEffect = (x, y, gameEmitter, type) => {
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
class PhantomEchoData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.PhantomEchoData = PhantomEchoData;
class PhantomEchoSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: PhantomEchoData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.PhantomEchoSpellCast = PhantomEchoSpellCast;
const PhantomEchoCast = (state, caster, target, position) => {
    return new PhantomEchoSpellCast({
        spellId: o1js_1.CircuitString.fromString('PhantomEcho').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.PhantomEchoCast = PhantomEchoCast;
const PhantomEchoModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    // Diamond 3x3 means manhattan distance <= 1 from center
    const distance = selfPosition.manhattanDistance(targetPosition);
    const isInDiamond = distance.lessThanOrEqual(o1js_1.UInt64.from(1));
    const damage = o1js_1.UInt64.from(30);
    const damageToApply = o1js_1.Provable.if(isInDiamond, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
    // If hit, apply visibility and vulnerability effects (provable)
    // Remove invisibility / make visible
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Revealed').hash(),
        duration: o1js_1.Field.from(1),
        param: (0, o1js_1.Field)(0),
    }), 'public', isInDiamond);
    // Apply vulnerability (+50% damage taken)
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Vulnerable').hash(),
        duration: o1js_1.Field.from(1),
        param: (0, o1js_1.Field)(50), // +50% damage taken
    }), 'endOfRound', isInDiamond);
};
exports.PhantomEchoModifier = PhantomEchoModifier;
const PhantomEchoAffectedArea = (x, y) => {
    // Diamond 3x3 pattern (manhattan distance <= 1)
    return [
        { x: x, y: y },
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
    ];
};
const PhantomEchoSceneEffect = (x, y, gameEmitter, type) => {
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
class ShadowStrikeData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.ShadowStrikeData = ShadowStrikeData;
class ShadowStrikeSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: ShadowStrikeData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.ShadowStrikeSpellCast = ShadowStrikeSpellCast;
const ShadowStrikeCast = (state, caster, target, position) => {
    return new ShadowStrikeSpellCast({
        spellId: o1js_1.CircuitString.fromString('ShadowStrike').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.ShadowStrikeCast = ShadowStrikeCast;
const ShadowStrikeModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    let damage = o1js_1.UInt64.from(50);
    // +20% critical hit chance
    const chance = stater.getRandomPercentage();
    // Base crit + 20% bonus = check if random < 20
    const isCritical = chance.lessThan(o1js_1.UInt64.from(20));
    damage = o1js_1.Provable.if(isCritical, damage.mul(o1js_1.UInt64.from(2)), // Critical hits deal double damage
    damage);
    const damageToApply = o1js_1.Provable.if(directHit, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
};
exports.ShadowStrikeModifier = ShadowStrikeModifier;
const ShadowStrikeSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'shadow_strike',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const ShadowStrikeAffectedArea = (x, y) => {
    return [{ x, y }];
};
// ============================================================================
// SHADOW DASH (Spectral Form) - Dash at opponent
// Deal up to +100% extra damage depending on distance
// ============================================================================
class ShadowDashData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.ShadowDashData = ShadowDashData;
class ShadowDashSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: ShadowDashData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.ShadowDashSpellCast = ShadowDashSpellCast;
const ShadowDashCast = (state, caster, target, position) => {
    return new ShadowDashSpellCast({
        spellId: o1js_1.CircuitString.fromString('ShadowDash').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.ShadowDashCast = ShadowDashCast;
const ShadowDashModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const casterPosition = opponentState.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    // Calculate distance from caster to target for damage scaling
    const distance = casterPosition.manhattanDistance(selfPosition);
    const directHit = selfPosition
        .manhattanDistance(targetPosition)
        .equals(o1js_1.UInt64.from(0));
    // Base damage 50, up to +100% based on distance (max at distance 7)
    const baseDamage = o1js_1.UInt64.from(50);
    // Scale damage based on distance: 50 + (distance/7 * 50) = 50 to 100 damage
    // bonusDamage = min(distance * 50 / 7, 50)
    const scaledDistance = distance.mul(o1js_1.UInt64.from(50));
    const rawBonusDamage = scaledDistance.div(o1js_1.UInt64.from(7));
    const maxBonus = o1js_1.UInt64.from(50);
    const isCapped = rawBonusDamage.greaterThan(maxBonus);
    const bonusDamage = o1js_1.Provable.if(isCapped, maxBonus, rawBonusDamage);
    const totalDamage = baseDamage.add(bonusDamage);
    const damageToApply = o1js_1.Provable.if(directHit, totalDamage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
};
exports.ShadowDashModifier = ShadowDashModifier;
const ShadowDashSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'shadow_dash',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const ShadowDashAffectedArea = (x, y) => {
    return [{ x, y }];
};
// ============================================================================
// SHADOW DASH MOVE (Spectral Form) - Companion spell to update caster position
// Cast on self to move to the dash target position
// ============================================================================
class ShadowDashMoveData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.ShadowDashMoveData = ShadowDashMoveData;
class ShadowDashMoveSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: ShadowDashMoveData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.ShadowDashMoveSpellCast = ShadowDashMoveSpellCast;
const ShadowDashMoveCast = (state, caster, target, position) => {
    return new ShadowDashMoveSpellCast({
        spellId: o1js_1.CircuitString.fromString('ShadowDashMove').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.ShadowDashMoveCast = ShadowDashMoveCast;
const ShadowDashMoveModifier = (stater, spellCast, opponentState) => {
    const targetPosition = spellCast.additionalData.position;
    // Update caster's position to the dash target
    stater.state.playerStats.position = new structs_2.PositionOption({
        value: targetPosition,
        isSome: (0, o1js_1.Field)(1),
    });
};
exports.ShadowDashMoveModifier = ShadowDashMoveModifier;
const ShadowDashMoveSceneEffect = (x, y, gameEmitter, type) => {
    // The visual dash effect is handled by ShadowDash, this is just the position update
    gameEmitter.throwEffect({
        animationName: 'shadow_dash_move',
        x,
        y,
        overlayId: type,
        scale: 1.0,
    });
};
const ShadowDashMoveAffectedArea = (x, y) => {
    return [{ x, y }];
};
// ============================================================================
// WHIRLING BLADES (Spectral Form) - Deal 50 damage to 3x3 area
// ============================================================================
class WhirlingBladesData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.WhirlingBladesData = WhirlingBladesData;
class WhirlingBladesSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: WhirlingBladesData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([
            this.caster,
            this.spellId,
            this.target,
            this.additionalData.position.hash(),
        ]);
    }
}
exports.WhirlingBladesSpellCast = WhirlingBladesSpellCast;
const WhirlingBladesCast = (state, caster, target, position) => {
    return new WhirlingBladesSpellCast({
        spellId: o1js_1.CircuitString.fromString('WhirlingBlades').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.WhirlingBladesCast = WhirlingBladesCast;
const WhirlingBladesModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    // 3x3 area = Chebyshev distance <= 1 (or manhattan distance <= 2 with diagonal consideration)
    // Using max of absolute x and y difference
    const xDiff = selfPosition.x.sub(targetPosition.x).magnitude;
    const yDiff = selfPosition.y.sub(targetPosition.y).magnitude;
    // Check if within 3x3 (Chebyshev distance of 1)
    const inXRange = xDiff.lessThanOrEqual(o1js_1.UInt64.from(1));
    const inYRange = yDiff.lessThanOrEqual(o1js_1.UInt64.from(1));
    const isInArea = inXRange.and(inYRange);
    const damage = o1js_1.UInt64.from(50);
    const damageToApply = o1js_1.Provable.if(isInArea, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
};
exports.WhirlingBladesModifier = WhirlingBladesModifier;
const WhirlingBladesAffectedArea = (x, y) => {
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
const WhirlingBladesSceneEffect = (x, y, gameEmitter, type) => {
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
exports.phantomDuelistSpells = [
    // === REGULAR SKILLS ===
    {
        id: o1js_1.CircuitString.fromString('SpectralArrow').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(1),
        name: 'SpectralArrow',
        description: 'Deal 50 damage to a single target.',
        image: '/wizards/skills/spectral-arrow.png',
        modifierData: SpectralArrowData,
        modifier: exports.SpectralArrowModifier,
        spellCast: SpectralArrowSpellCast,
        cast: exports.SpectralArrowCast,
        sceneEffect: SpectralArrowSceneEffect,
        affectedArea: SpectralArrowAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('SpectralArrow').hash(),
            cooldown: o1js_1.Int64.from(1),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('ShadowVeil').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(5),
        name: 'ShadowVeil',
        description: 'Become invisible for 2 turns. Next attack deals +50% damage and reveals you.',
        image: '/wizards/skills/shadowVeil.png',
        modifierData: ShadowVeilData,
        modifier: exports.ShadowVeilModifier,
        spellCast: ShadowVeilSpellCast,
        cast: exports.ShadowVeilCast,
        sceneEffect: ShadowVeilSceneEffect,
        affectedArea: ShadowVeilAffectedArea,
        target: 'ally',
        priority: 1,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('ShadowVeil').hash(),
            cooldown: o1js_1.Int64.from(5),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('SpectralProjection').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(6),
        name: 'SpectralProjection',
        description: "Create a spectral projection on opponent's field for 3 turns, transforming skills into melee variants.",
        image: '/wizards/skills/spectralProjection.png',
        modifierData: SpectralProjectionData,
        modifier: exports.SpectralProjectionModifier,
        spellCast: SpectralProjectionSpellCast,
        cast: exports.SpectralProjectionCast,
        affectedArea: SpectralProjectionAffectedArea,
        target: 'ally',
        priority: 1,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('SpectralProjection').hash(),
            cooldown: o1js_1.Int64.from(6),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('DusksEmbrace').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(2),
        name: 'DusksEmbrace',
        description: 'Deal 50 damage to a horizontal line and apply Weaken (-30% Defence) for 2 turns if hit.',
        image: '/wizards/skills/dusksEmbrace.png',
        modifierData: DusksEmbraceData,
        modifier: exports.DusksEmbraceModifier,
        spellCast: DusksEmbraceSpellCast,
        cast: exports.DusksEmbraceCast,
        sceneEffect: DusksEmbraceSceneEffect,
        affectedArea: DusksEmbraceAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('DusksEmbrace').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('PhantomEcho').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(3),
        name: 'PhantomEcho',
        description: 'Deal 30 damage to a diamond 3x3 area. If hit, opponent becomes visible and takes +50% damage for 1 turn.',
        image: '/wizards/skills/phantomEcho.png',
        modifierData: PhantomEchoData,
        modifier: exports.PhantomEchoModifier,
        spellCast: PhantomEchoSpellCast,
        cast: exports.PhantomEchoCast,
        sceneEffect: PhantomEchoSceneEffect,
        affectedArea: PhantomEchoAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('PhantomEcho').hash(),
            cooldown: o1js_1.Int64.from(3),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    // === SPECTRAL FORM SKILLS (Melee variants) ===
    {
        id: o1js_1.CircuitString.fromString('ShadowStrike').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(1),
        name: 'ShadowStrike',
        description: 'Deal 50 damage with +20% critical chance. (Spectral Form)',
        image: '/wizards/skills/shadowStrike.png',
        modifierData: ShadowStrikeData,
        modifier: exports.ShadowStrikeModifier,
        spellCast: ShadowStrikeSpellCast,
        cast: exports.ShadowStrikeCast,
        sceneEffect: ShadowStrikeSceneEffect,
        affectedArea: ShadowStrikeAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('ShadowStrike').hash(),
            cooldown: o1js_1.Int64.from(1),
            currentCooldown: o1js_1.Int64.from(0),
        },
        hidden: true,
    },
    {
        id: o1js_1.CircuitString.fromString('ShadowDash').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(2),
        name: 'ShadowDash',
        description: 'Dash at opponent dealing up to +100% extra damage depending on distance. (Spectral Form)',
        image: '/wizards/skills/shadowDash.png',
        modifierData: ShadowDashData,
        modifier: exports.ShadowDashModifier,
        spellCast: ShadowDashSpellCast,
        cast: exports.ShadowDashCast,
        sceneEffect: ShadowDashSceneEffect,
        affectedArea: ShadowDashAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('ShadowDash').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
        hidden: true,
        companionSpellId: o1js_1.CircuitString.fromString('ShadowDashMove').hash(),
    },
    {
        id: o1js_1.CircuitString.fromString('ShadowDashMove').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(0),
        name: 'ShadowDashMove',
        description: 'Move to dash target position. (Companion spell for ShadowDash)',
        image: '/wizards/skills/shadowDash.png',
        modifierData: ShadowDashMoveData,
        modifier: exports.ShadowDashMoveModifier,
        spellCast: ShadowDashMoveSpellCast,
        cast: exports.ShadowDashMoveCast,
        sceneEffect: ShadowDashMoveSceneEffect,
        affectedArea: ShadowDashMoveAffectedArea,
        target: 'ally',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('ShadowDashMove').hash(),
            cooldown: o1js_1.Int64.from(0),
            currentCooldown: o1js_1.Int64.from(0),
        },
        hidden: true,
    },
    {
        id: o1js_1.CircuitString.fromString('WhirlingBlades').hash(),
        wizardId: wizards_1.WizardId.PHANTOM_DUELIST,
        cooldown: (0, o1js_1.Field)(3),
        name: 'WhirlingBlades',
        description: 'Deal 50 damage to a 3x3 area. (Spectral Form)',
        image: '/wizards/skills/whirlingBlades.png',
        modifierData: WhirlingBladesData,
        modifier: exports.WhirlingBladesModifier,
        spellCast: WhirlingBladesSpellCast,
        cast: exports.WhirlingBladesCast,
        sceneEffect: WhirlingBladesSceneEffect,
        affectedArea: WhirlingBladesAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('WhirlingBlades').hash(),
            cooldown: o1js_1.Int64.from(3),
            currentCooldown: o1js_1.Int64.from(0),
        },
        hidden: true,
    },
];

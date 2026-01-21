"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archerSpells = exports.CloudModifier = exports.CloudCast = exports.CloudSpellCast = exports.CloudData = exports.DecoyModifier = exports.DecoyCast = exports.DecoySpellCast = exports.DecoyData = exports.HailOfArrowsModifier = exports.HailOfArrowsCast = exports.HailOfArrowsSpellCast = exports.HailOfArrowsData = exports.AimingShotModifier = exports.AimingShotCast = exports.AimingShotSpellCast = exports.AimingShotData = exports.ArrowModifier = exports.ArrowCast = exports.ArrowSpellCast = exports.ArrowData = void 0;
const structs_1 = require("../structs");
const o1js_1 = require("o1js");
const wizards_1 = require("../../wizards");
class ArrowData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.ArrowData = ArrowData;
class ArrowSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: ArrowData,
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
exports.ArrowSpellCast = ArrowSpellCast;
const ArrowCast = (state, caster, target, position) => {
    return new ArrowSpellCast({
        spellId: o1js_1.CircuitString.fromString('Arrow').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.ArrowCast = ArrowCast;
const ArrowModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    // Damage
    const damage = o1js_1.UInt64.from(30);
    const damageToApply = o1js_1.Provable.if(directHit, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
    // Bleeding effect (provable)
    const chance = stater.getRandomPercentage();
    const isBleeding = directHit.and(chance.lessThan(o1js_1.UInt64.from(50)));
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Bleeding').hash(),
        duration: o1js_1.Field.from(3),
        param: (0, o1js_1.Field)(0),
    }), 'endOfRound', isBleeding);
};
exports.ArrowModifier = ArrowModifier;
const ArrowSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'arrow',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const ArrowAffectedArea = (x, y) => {
    return [{ x, y }];
};
class AimingShotData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.AimingShotData = AimingShotData;
class AimingShotSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: AimingShotData,
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
exports.AimingShotSpellCast = AimingShotSpellCast;
const AimingShotCast = (state, caster, target, position) => {
    return new AimingShotSpellCast({
        spellId: o1js_1.CircuitString.fromString('AimingShot').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.AimingShotCast = AimingShotCast;
const AimingShotModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    const damage = o1js_1.UInt64.from(100);
    let damageToApply = o1js_1.Provable.if(directHit, damage, o1js_1.UInt64.from(0));
    // #TODO make provable
    // Critical hit
    let randomValue = stater.getRandomPercentage();
    const isCritical = randomValue.lessThan(o1js_1.UInt64.from(10));
    if (isCritical.toBoolean()) {
        damageToApply = damageToApply.mul(o1js_1.UInt64.from(2));
    }
    stater.applyDamage(damageToApply, opponentState);
};
exports.AimingShotModifier = AimingShotModifier;
const AimingShotSceneEffect = (x, y, gameEmitter, type) => {
    gameEmitter.throwEffect({
        animationName: 'aimingshot',
        x,
        y,
        overlayId: type,
        scale: 1.5,
    });
};
const AimingShotAffectedArea = (x, y) => {
    return [{ x, y }];
};
class HailOfArrowsData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.HailOfArrowsData = HailOfArrowsData;
class HailOfArrowsSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: HailOfArrowsData,
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
exports.HailOfArrowsSpellCast = HailOfArrowsSpellCast;
const HailOfArrowsCast = (state, caster, target, position) => {
    return new HailOfArrowsSpellCast({
        spellId: o1js_1.CircuitString.fromString('HailOfArrows').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.HailOfArrowsCast = HailOfArrowsCast;
const HailOfArrowsModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const hasDamage = distance.lessThanOrEqual(o1js_1.UInt64.from(3));
    const damageToApply = o1js_1.Provable.if(hasDamage, o1js_1.UInt64.from(50), o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
    // Slowing effect (provable)
    const chance = stater.getRandomPercentage();
    const isSlowing = hasDamage.and(chance.lessThan(o1js_1.UInt64.from(20)));
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('SlowingRestoration').hash(),
        duration: o1js_1.Field.from(3),
        param: (0, o1js_1.Field)(0),
    }), 'endOfRound', isSlowing);
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Slowing').hash(),
        duration: o1js_1.Field.from(2),
        param: (0, o1js_1.Field)(0),
    }), 'endOfRound', isSlowing);
};
exports.HailOfArrowsModifier = HailOfArrowsModifier;
const HailOfArrowsAffectedArea = (x, y) => {
    return [
        { x: x, y: y },
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
    ];
};
const HailOfArrowsSceneEffect = (x, y, gameEmitter, type) => {
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
class DecoyData extends (0, o1js_1.Struct)({}) {
}
exports.DecoyData = DecoyData;
class DecoySpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: DecoyData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([this.caster, this.spellId, this.target]);
    }
}
exports.DecoySpellCast = DecoySpellCast;
const DecoyCast = (state, caster, target) => {
    return new DecoySpellCast({
        spellId: o1js_1.CircuitString.fromString('Decoy').hash(),
        caster,
        target,
        additionalData: {},
    });
};
exports.DecoyCast = DecoyCast;
const DecoyModifier = (stater, spellCast, opponentState) => {
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Decoy').hash(),
        duration: o1js_1.Field.from(2),
        param: (0, o1js_1.Field)(0),
    }), 'public', (0, o1js_1.Bool)(true));
};
exports.DecoyModifier = DecoyModifier;
class CloudData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.CloudData = CloudData;
class CloudSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: CloudData,
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
exports.CloudSpellCast = CloudSpellCast;
const CloudCast = (state, caster, target, position) => {
    return new CloudSpellCast({
        spellId: o1js_1.CircuitString.fromString('Cloud').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.CloudCast = CloudCast;
const CloudModifier = (stater, spellCast, opponentState) => {
    console.log('Cloud modifier');
    stater.state.pushEffect(new structs_1.Effect({
        effectId: o1js_1.CircuitString.fromString('Cloud').hash(),
        duration: o1js_1.Field.from(3),
        param: (0, o1js_1.Field)(spellCast.additionalData.position.x.toBigint() +
            spellCast.additionalData.position.y.toBigint() * 8n),
    }), 'public', (0, o1js_1.Bool)(true));
};
exports.CloudModifier = CloudModifier;
const CloudAffectedArea = (x, y) => {
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
const CloudSceneEffect = (x, y, gameEmitter, type) => {
    const positions = CloudAffectedArea(x, y);
    let effectsId = [];
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
        }
        else {
            effectsId.forEach((effectId) => {
                gameEmitter.removeEffect(effectId);
            });
        }
    };
};
exports.archerSpells = [
    {
        id: o1js_1.CircuitString.fromString('Arrow').hash(),
        wizardId: wizards_1.WizardId.ARCHER,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Arrow',
        description: 'A single arrow shot',
        image: '/wizards/skills/arrow.png',
        modifierData: ArrowData,
        modifier: exports.ArrowModifier,
        spellCast: ArrowSpellCast,
        cast: exports.ArrowCast,
        sceneEffect: ArrowSceneEffect,
        affectedArea: ArrowAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Arrow').hash(),
            cooldown: o1js_1.Int64.from(1),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('AimingShot').hash(),
        wizardId: wizards_1.WizardId.ARCHER,
        cooldown: (0, o1js_1.Field)(1),
        name: 'AimingShot',
        description: 'A shot with a higher chance of critical hit',
        image: '/wizards/skills/aimingShot.png',
        modifierData: AimingShotData,
        modifier: exports.AimingShotModifier,
        spellCast: AimingShotSpellCast,
        sceneEffect: AimingShotSceneEffect,
        affectedArea: AimingShotAffectedArea,
        cast: exports.AimingShotCast,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('AimingShot').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('HailOfArrows').hash(),
        wizardId: wizards_1.WizardId.ARCHER,
        cooldown: (0, o1js_1.Field)(1),
        name: 'HailOfArrows',
        description: 'A hail of arrows',
        image: '/wizards/skills/hailOfArrows.png',
        modifierData: HailOfArrowsData,
        modifier: exports.HailOfArrowsModifier,
        spellCast: HailOfArrowsSpellCast,
        cast: exports.HailOfArrowsCast,
        sceneEffect: HailOfArrowsSceneEffect,
        affectedArea: HailOfArrowsAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('HailOfArrows').hash(),
            cooldown: o1js_1.Int64.from(3),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('Decoy').hash(),
        wizardId: wizards_1.WizardId.ARCHER,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Decoy',
        description: 'Create a decoy',
        image: '/wizards/skills/decoy.png',
        modifierData: DecoyData,
        modifier: exports.DecoyModifier,
        spellCast: DecoySpellCast,
        cast: exports.DecoyCast,
        target: 'ally',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Decoy').hash(),
            cooldown: o1js_1.Int64.from(3),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('Cloud').hash(),
        wizardId: wizards_1.WizardId.ARCHER,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Cloud',
        description: 'Create a cloud',
        image: '/wizards/skills/smokeCloud.png',
        modifierData: CloudData,
        modifier: exports.CloudModifier,
        spellCast: CloudSpellCast,
        cast: exports.CloudCast,
        sceneEffect: CloudSceneEffect,
        affectedArea: CloudAffectedArea,
        target: 'ally',
        globalStatus: 'global',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Cloud').hash(),
            cooldown: o1js_1.Int64.from(3),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
];

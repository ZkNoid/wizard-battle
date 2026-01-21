"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mageSpells = exports.HealModifier = exports.HealCast = exports.HealSpellCast = exports.HealData = exports.TeleportModifier = exports.TeleportCast = exports.TeleportSpellCast = exports.TeleportData = exports.LaserModifier = exports.LaserCast = exports.LaserSpellCast = exports.LaserData = exports.FireBallModifier = exports.FireBallCast = exports.FireBallSpellCast = exports.FireBallData = exports.LightningBoldModifier = exports.LightningBoldCast = exports.LightningBoldSpellCast = exports.LightningBoldData = void 0;
const o1js_1 = require("o1js");
const structs_1 = require("../structs");
const wizards_1 = require("../../wizards");
class LightningBoldData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.LightningBoldData = LightningBoldData;
class LightningBoldSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: LightningBoldData,
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
exports.LightningBoldSpellCast = LightningBoldSpellCast;
const LightningBoldCast = (state, caster, target, position) => {
    return new LightningBoldSpellCast({
        spellId: o1js_1.CircuitString.fromString('LightningBold').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.LightningBoldCast = LightningBoldCast;
const LightningBoldModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    console.log('LightningBoldModifier');
    console.log(selfPosition);
    console.log(targetPosition);
    console.log(spellCast.additionalData);
    const distance = selfPosition.manhattanDistance(targetPosition);
    const damage = o1js_1.UInt64.from(80);
    const damage2 = o1js_1.UInt64.from(40);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    const nearbyHit = distance.equals(o1js_1.UInt64.from(1));
    const distantHit = directHit.not().and(nearbyHit.not());
    const damageToApply = o1js_1.Provable.switch([directHit, nearbyHit, distantHit], o1js_1.UInt64, [damage, damage2, o1js_1.UInt64.from(0)]);
    stater.applyDamage(damageToApply, opponentState);
};
exports.LightningBoldModifier = LightningBoldModifier;
const LightningBoldAffectedArea = (x, y) => {
    return [
        { x: x, y: y },
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
    ];
};
const LightningBoldSceneEffect = (x, y, gameEmitter, type) => {
    const positions = LightningBoldAffectedArea(x, y);
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
class FireBallData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.FireBallData = FireBallData;
class FireBallSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: FireBallData,
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
exports.FireBallSpellCast = FireBallSpellCast;
const FireBallCast = (state, caster, target, position) => {
    return new FireBallSpellCast({
        spellId: o1js_1.CircuitString.fromString('FireBall').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.FireBallCast = FireBallCast;
const FireBallModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const distance = selfPosition.manhattanDistance(targetPosition);
    const damage = o1js_1.UInt64.from(50);
    const damage2 = o1js_1.UInt64.from(25);
    const damage3 = o1js_1.UInt64.from(15);
    const directHit = distance.equals(o1js_1.UInt64.from(0));
    const nearbyHit = distance.equals(o1js_1.UInt64.from(1));
    const farHit = distance.equals(o1js_1.UInt64.from(2));
    const distantHit = directHit.not().and(nearbyHit.not()).and(farHit.not());
    const damageToApply = o1js_1.Provable.switch([directHit, nearbyHit, farHit, distantHit], o1js_1.UInt64, [damage, damage2, damage3, o1js_1.UInt64.from(0)]);
    stater.applyDamage(damageToApply, opponentState);
};
exports.FireBallModifier = FireBallModifier;
const FireBallAffectedArea = (x, y) => {
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
const FireBallSceneEffect = (x, y, gameEmitter, type) => {
    const positions = FireBallAffectedArea(x, y);
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
class LaserData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.LaserData = LaserData;
class LaserSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: LaserData,
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
exports.LaserSpellCast = LaserSpellCast;
const LaserCast = (state, caster, target, position) => {
    return new LaserSpellCast({
        spellId: o1js_1.CircuitString.fromString('Laser').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.LaserCast = LaserCast;
const LaserModifier = (stater, spellCast, opponentState) => {
    const selfPosition = stater.state.playerStats.position.value;
    const targetPosition = spellCast.additionalData.position;
    const sameRow = selfPosition.x.equals(targetPosition.x);
    const sameColumn = selfPosition.y.equals(targetPosition.y);
    const hit = sameRow.or(sameColumn);
    const damage = o1js_1.UInt64.from(50);
    const damageToApply = o1js_1.Provable.if(hit, damage, o1js_1.UInt64.from(0));
    stater.applyDamage(damageToApply, opponentState);
};
exports.LaserModifier = LaserModifier;
const LaserAffectedArea = (x, y) => {
    const positions = [];
    // Add vertical line
    for (let i = 0; i < 8; i++) {
        if (i !== y) {
            positions.push({ x, y: i });
        }
    }
    // Add horizontal line
    for (let i = 0; i < 8; i++) {
        if (i !== x) {
            positions.push({ x: i, y });
        }
    }
    // Add center
    positions.push({ x, y });
    return positions;
};
const LaserSceneEffect = (x, y, gameEmitter, type) => {
    for (let i = 0; i < 8; i++) {
        if (i === y)
            continue;
        gameEmitter.throwEffect({
            overlayId: type,
            animationName: 'laser_vertical',
            x,
            y: i,
            scale: 1.5,
        });
    }
    for (let i = 0; i < 8; i++) {
        if (i === x)
            continue;
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
class TeleportData extends (0, o1js_1.Struct)({
    position: structs_1.Position,
}) {
}
exports.TeleportData = TeleportData;
class TeleportSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: TeleportData,
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
exports.TeleportSpellCast = TeleportSpellCast;
const TeleportCast = (state, caster, target, position) => {
    return new TeleportSpellCast({
        spellId: o1js_1.CircuitString.fromString('Teleport').hash(),
        caster,
        target,
        additionalData: {
            position,
        },
    });
};
exports.TeleportCast = TeleportCast;
const TeleportModifier = (stater, spellCast, opponentState) => {
    stater.state.playerStats.position = new structs_1.PositionOption({
        value: spellCast.additionalData.position,
        isSome: (0, o1js_1.Field)(1),
    });
};
exports.TeleportModifier = TeleportModifier;
const TeleportAffectedArea = (x, y) => {
    return [{ x, y }];
};
class HealData extends (0, o1js_1.Struct)({}) {
}
exports.HealData = HealData;
class HealSpellCast extends (0, o1js_1.Struct)({
    caster: o1js_1.Field,
    spellId: o1js_1.Field,
    target: o1js_1.Field,
    additionalData: HealData,
}) {
    hash() {
        return o1js_1.Poseidon.hash([this.caster, this.spellId, this.target]);
    }
}
exports.HealSpellCast = HealSpellCast;
const HealCast = (state, caster, target) => {
    return new HealSpellCast({
        spellId: o1js_1.CircuitString.fromString('Heal').hash(),
        caster,
        target,
        additionalData: {},
    });
};
exports.HealCast = HealCast;
const HealModifier = (stater, spellCast, opponentState) => {
    stater.state.playerStats.hp = stater.state.playerStats.hp.add(o1js_1.Int64.from(50));
    // If the player has more health than the max health, set the health to the max health
    stater.state.playerStats.hp = o1js_1.Provable.if(stater.state.playerStats.hp
        .sub(stater.state.playerStats.maxHp)
        .isPositive(), stater.state.playerStats.maxHp, stater.state.playerStats.hp);
};
exports.HealModifier = HealModifier;
exports.mageSpells = [
    {
        id: o1js_1.CircuitString.fromString('LightningBold').hash(),
        wizardId: wizards_1.WizardId.MAGE,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Lightning',
        description: 'A powerful bolt of lightning. High one point damage',
        image: '/wizards/skills/lightning.png',
        modifierData: LightningBoldData,
        modifier: exports.LightningBoldModifier,
        spellCast: LightningBoldSpellCast,
        cast: exports.LightningBoldCast,
        sceneEffect: LightningBoldSceneEffect,
        affectedArea: LightningBoldAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('LightningBold').hash(),
            cooldown: o1js_1.Int64.from(1),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('FireBall').hash(),
        wizardId: wizards_1.WizardId.MAGE,
        cooldown: (0, o1js_1.Field)(1),
        name: 'FireBall',
        description: 'A ball of fire. Deals damage to a single target',
        image: '/wizards/skills/fireball.png',
        modifierData: FireBallData,
        modifier: exports.FireBallModifier,
        spellCast: FireBallSpellCast,
        cast: exports.FireBallCast,
        sceneEffect: FireBallSceneEffect,
        affectedArea: FireBallAffectedArea,
        target: 'enemy',
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('FireBall').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('Teleport').hash(),
        wizardId: wizards_1.WizardId.MAGE,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Teleport',
        description: 'Teleport to a random position',
        image: '/wizards/skills/teleport.png',
        modifierData: TeleportData,
        modifier: exports.TeleportModifier,
        spellCast: TeleportSpellCast,
        cast: exports.TeleportCast,
        affectedArea: TeleportAffectedArea,
        target: 'ally',
        priority: 1,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Teleport').hash(),
            cooldown: o1js_1.Int64.from(4),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('Heal').hash(),
        wizardId: wizards_1.WizardId.MAGE,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Heal',
        description: 'Heal yourself for 100 health',
        image: '/wizards/skills/heal.png',
        modifierData: HealData,
        modifier: exports.HealModifier,
        spellCast: HealSpellCast,
        cast: exports.HealCast,
        target: 'ally',
        priority: 1,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Heal').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
    {
        id: o1js_1.CircuitString.fromString('Laser').hash(),
        wizardId: wizards_1.WizardId.MAGE,
        cooldown: (0, o1js_1.Field)(1),
        name: 'Laser',
        description: 'A beam of laser. Deals damage to a single target',
        image: '/wizards/skills/laser.png',
        modifierData: LaserData,
        modifier: exports.LaserModifier,
        spellCast: LaserSpellCast,
        cast: exports.LaserCast,
        target: 'enemy',
        sceneEffect: LaserSceneEffect,
        affectedArea: LaserAffectedArea,
        defaultValue: {
            spellId: o1js_1.CircuitString.fromString('Laser').hash(),
            cooldown: o1js_1.Int64.from(2),
            currentCooldown: o1js_1.Int64.from(0),
        },
    },
];

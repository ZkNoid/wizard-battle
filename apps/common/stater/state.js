"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = exports.maxSpellEffects = exports.spellStatsAmount = void 0;
const o1js_1 = require("o1js");
const structs_1 = require("./structs");
exports.spellStatsAmount = 5;
exports.maxSpellEffects = 10;
function reify(TProvable, v) {
    return TProvable.fromFields(TProvable.toFields(v), []);
}
class State extends (0, o1js_1.Struct)({
    playerId: o1js_1.Field,
    wizardId: o1js_1.Field,
    playerStats: structs_1.PlayerStats,
    spellStats: o1js_1.Provable.Array(structs_1.SpellStats, exports.spellStatsAmount),
    endOfRoundEffects: o1js_1.Provable.Array(structs_1.Effect, exports.maxSpellEffects),
    publicStateEffects: o1js_1.Provable.Array(structs_1.Effect, exports.maxSpellEffects),
    onEndEffects: o1js_1.Provable.Array(structs_1.Effect, exports.maxSpellEffects),
    map: o1js_1.Provable.Array(o1js_1.Field, 64),
    turnId: o1js_1.Int64,
    randomSeed: o1js_1.Field,
    signingKey: o1js_1.PrivateKey,
}) {
    static default() {
        return new State({
            playerId: (0, o1js_1.Field)(0),
            wizardId: o1js_1.CircuitString.fromString('Mage').hash(),
            playerStats: new structs_1.PlayerStats({
                hp: o1js_1.Int64.from(100),
                maxHp: o1js_1.Int64.from(100),
                position: new structs_1.PositionOption({
                    value: new structs_1.Position({ x: o1js_1.Int64.from(0), y: o1js_1.Int64.from(0) }),
                    isSome: (0, o1js_1.Field)(1),
                }),
                speed: o1js_1.Int64.from(1),
                attack: o1js_1.UInt64.from(100),
                defense: o1js_1.UInt64.from(100),
                critChance: o1js_1.UInt64.from(0),
                dodgeChance: o1js_1.UInt64.from(0),
                accuracy: o1js_1.UInt64.from(0),
            }),
            spellStats: Array(exports.spellStatsAmount).fill(new structs_1.SpellStats({
                spellId: (0, o1js_1.Field)(0),
                cooldown: o1js_1.Int64.from(0),
                currentCooldown: o1js_1.Int64.from(0),
            })),
            endOfRoundEffects: Array(exports.maxSpellEffects).fill(new structs_1.Effect({
                effectId: (0, o1js_1.Field)(0),
                duration: (0, o1js_1.Field)(0),
                param: (0, o1js_1.Field)(0),
            })),
            publicStateEffects: Array(exports.maxSpellEffects).fill(new structs_1.Effect({
                effectId: (0, o1js_1.Field)(0),
                duration: (0, o1js_1.Field)(0),
                param: (0, o1js_1.Field)(0),
            })),
            onEndEffects: Array(exports.maxSpellEffects).fill(new structs_1.Effect({
                effectId: (0, o1js_1.Field)(0),
                duration: (0, o1js_1.Field)(0),
                param: (0, o1js_1.Field)(0),
            })),
            map: Array(64).fill((0, o1js_1.Field)(0)),
            turnId: o1js_1.Int64.from(0),
            randomSeed: (0, o1js_1.Field)(BigInt(Math.floor(Math.random() * 1000000))),
            signingKey: o1js_1.PrivateKey.random(),
        });
    }
    copy() {
        return State.fromFields(State.toFields(this));
    }
    getCommit() {
        // Hash all fields
        return o1js_1.Poseidon.hash([]);
    }
    getSpellLength() {
        for (let i = 0; i < this.spellStats.length; i++) {
            if (this.spellStats[i].spellId.equals((0, o1js_1.Field)(0)).toBoolean()) {
                return i;
            }
        }
        return this.spellStats.length;
    }
    setPlayerStats(playerStats) {
        this.playerStats = playerStats;
    }
    pushSpell(spell) {
        let spellLength = this.getSpellLength();
        if (spellLength >= exports.spellStatsAmount) {
            throw new Error('Spell stats array is full');
        }
        this.spellStats[spellLength] = spell;
    }
    removeSpell(spellId) {
        let spellLength = this.getSpellLength();
        for (let i = 0; i < spellLength; i++) {
            if (this.spellStats[i].spellId.equals(spellId).toBoolean()) {
                this.spellStats[i] = this.spellStats[spellLength - 1];
                this.spellStats[spellLength - 1] = new structs_1.SpellStats({
                    spellId: (0, o1js_1.Field)(0),
                    cooldown: o1js_1.Int64.from(0),
                    currentCooldown: o1js_1.Int64.from(0),
                });
                break;
            }
        }
    }
    getEffects(type) {
        switch (type) {
            case 'public':
                return this.publicStateEffects;
            case 'endOfRound':
                return this.endOfRoundEffects;
            case 'onEnd':
                return this.onEndEffects;
        }
    }
    getEffectLength(type) {
        const effects = this.getEffects(type);
        for (let i = 0; i < effects.length; i++) {
            if (effects[i].effectId.equals((0, o1js_1.Field)(0)).toBoolean()) {
                return i;
            }
        }
        return effects.length;
    }
    pushEffect(effect, type, shouldAdd) {
        const effects = this.getEffects(type);
        // Track if we've already found and filled an empty slot
        let alreadyAdded = (0, o1js_1.Bool)(false);
        for (let i = 0; i < exports.maxSpellEffects; i++) {
            const currentEffect = effects[i];
            const isEmpty = currentEffect.effectId.equals((0, o1js_1.Field)(0));
            // Add to this slot if: shouldAdd AND isEmpty AND not already added
            const shouldAddHere = shouldAdd.and(isEmpty).and(alreadyAdded.not());
            effects[i] = o1js_1.Provable.if(shouldAddHere, structs_1.Effect, effect, currentEffect);
            // Update alreadyAdded: if we added here, mark as added
            alreadyAdded = o1js_1.Provable.if(shouldAddHere, (0, o1js_1.Bool)(true), alreadyAdded);
        }
    }
    removeEffect(effectId, type) {
        let effectLength = this.getEffectLength(type);
        const effects = this.getEffects(type);
        for (let i = 0; i < effectLength; i++) {
            if (effects[i].effectId.equals(effectId).toBoolean()) {
                effects[i] = effects[effectLength - 1];
            }
            effects[effectLength - 1] = new structs_1.Effect({
                effectId: (0, o1js_1.Field)(0),
                duration: (0, o1js_1.Field)(0),
                param: (0, o1js_1.Field)(0),
            });
            break;
        }
    }
    hash() {
        return o1js_1.Poseidon.hash(State.toFields(this));
    }
}
exports.State = State;

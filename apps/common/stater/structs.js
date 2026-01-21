"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Effect = exports.SpellStats = exports.PlayerStats = exports.PositionOption = exports.Position = void 0;
const o1js_1 = require("o1js");
class Position extends (0, o1js_1.Struct)({
    x: o1js_1.Int64,
    y: o1js_1.Int64,
}) {
    manhattanDistance(other) {
        return this.x.sub(other.x).magnitude.add(this.y.sub(other.y).magnitude);
    }
    hash() {
        return o1js_1.Poseidon.hash(Position.toFields(this));
    }
}
exports.Position = Position;
class PositionOption extends (0, o1js_1.Struct)({
    value: Position,
    isSome: o1js_1.Field,
}) {
}
exports.PositionOption = PositionOption;
class PlayerStats extends (0, o1js_1.Struct)({
    hp: o1js_1.Int64,
    maxHp: o1js_1.Int64,
    position: PositionOption,
    speed: o1js_1.Int64,
    attack: o1js_1.UInt64,
    defense: o1js_1.UInt64,
    critChance: o1js_1.UInt64,
    dodgeChance: o1js_1.UInt64,
    accuracy: o1js_1.UInt64,
}) {
}
exports.PlayerStats = PlayerStats;
class SpellStats extends (0, o1js_1.Struct)({
    spellId: o1js_1.Field,
    cooldown: o1js_1.Int64,
    currentCooldown: o1js_1.Int64,
}) {
}
exports.SpellStats = SpellStats;
class Effect extends (0, o1js_1.Struct)({
    effectId: o1js_1.Field,
    duration: o1js_1.Field,
    param: o1js_1.Field,
}) {
}
exports.Effect = Effect;

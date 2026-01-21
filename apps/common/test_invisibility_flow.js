"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stater_1 = require("./stater/stater");
const state_1 = require("./stater/state");
const o1js_1 = require("o1js");
const structs_1 = require("./stater/structs");
const phantom_duelist_1 = require("./stater/spells/phantom_duelist");
const common_1 = require("./stater/spells/common");
// Create a stater instance
const stater = new stater_1.Stater(state_1.State.default());
const opponentState = state_1.State.default();
// Set initial position
stater.state.playerStats.position = new structs_1.PositionOption({
    value: new structs_1.Position({ x: o1js_1.Int64.from(3), y: o1js_1.Int64.from(4) }),
    isSome: (0, o1js_1.Field)(1),
});
console.log('=== Initial State ===');
console.log('Position:', stater.state.playerStats.position.value.x.toString(), stater.state.playerStats.position.value.y.toString());
console.log('isSome:', stater.state.playerStats.position.isSome.toString());
// Turn 1: Cast Shadow Veil
console.log('\n=== Turn 1: Cast Shadow Veil ===');
const shadowVeilCast = new phantom_duelist_1.ShadowVeilSpellCast({
    spellId: o1js_1.CircuitString.fromString('ShadowVeil').hash(),
    caster: (0, o1js_1.Field)(1),
    target: (0, o1js_1.Field)(1),
    additionalData: new phantom_duelist_1.ShadowVeilData({}),
});
(0, phantom_duelist_1.ShadowVeilModifier)(stater, shadowVeilCast, opponentState);
// Check publicStateEffects
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0].effectId.toString());
console.log('publicStateEffects[0].duration:', stater.state.publicStateEffects[0].duration.toString());
// Generate public state
const publicState1 = stater.generatePublicState();
console.log('Public State isSome:', publicState1.playerStats.position.isSome.toString());
console.log('After generatePublicState - publicStateEffects[0].duration:', stater.state.publicStateEffects[0].duration.toString());
console.log('After generatePublicState - publicStateEffects[0].effectId:', stater.state.publicStateEffects[0].effectId.toString());
// Turn 2: Cast Move
console.log('\n=== Turn 2: Cast Move ===');
const moveCast = new common_1.MoveSpellCast({
    spellId: o1js_1.CircuitString.fromString('Move').hash(),
    caster: (0, o1js_1.Field)(1),
    target: (0, o1js_1.Field)(1),
    additionalData: new common_1.MoveData({
        position: new structs_1.Position({ x: o1js_1.Int64.from(5), y: o1js_1.Int64.from(6) }),
    }),
});
(0, common_1.MoveModifier)(stater, moveCast, opponentState);
console.log('After Move - Actual State isSome:', stater.state.playerStats.position.isSome.toString());
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0].effectId.toString());
console.log('publicStateEffects[0].duration:', stater.state.publicStateEffects[0].duration.toString());
// Generate public state
const publicState2 = stater.generatePublicState();
console.log('Public State isSome:', publicState2.playerStats.position.isSome.toString());
console.log('After generatePublicState - publicStateEffects[0].duration:', stater.state.publicStateEffects[0].duration.toString());
console.log('After generatePublicState - publicStateEffects[0].effectId:', stater.state.publicStateEffects[0].effectId.toString());
// Turn 3: Cast Move again
console.log('\n=== Turn 3: Cast Move (invisibility should be gone) ===');
const moveCast2 = new common_1.MoveSpellCast({
    spellId: o1js_1.CircuitString.fromString('Move').hash(),
    caster: (0, o1js_1.Field)(1),
    target: (0, o1js_1.Field)(1),
    additionalData: new common_1.MoveData({
        position: new structs_1.Position({ x: o1js_1.Int64.from(7), y: o1js_1.Int64.from(2) }),
    }),
});
(0, common_1.MoveModifier)(stater, moveCast2, opponentState);
console.log('After Move - Actual State isSome:', stater.state.playerStats.position.isSome.toString());
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0].effectId.toString());
// Generate public state
const publicState3 = stater.generatePublicState();
console.log('Public State isSome:', publicState3.playerStats.position.isSome.toString());

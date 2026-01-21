import { Stater } from './stater/stater';
import { State } from './stater/state';
import { CircuitString, Field, Int64, Bool } from 'o1js';
import { Effect, PositionOption, Position } from './stater/structs';
import { ShadowVeilModifier, ShadowVeilSpellCast, ShadowVeilData } from './stater/spells/phantom_duelist';
import { MoveModifier, MoveSpellCast, MoveData } from './stater/spells/common';

// Create a stater instance
const stater = new Stater(State.default());
const opponentState = State.default();

// Set initial position
stater.state.playerStats.position = new PositionOption({
  value: new Position({ x: Int64.from(3), y: Int64.from(4) }),
  isSome: Field(1),
});

console.log('=== Initial State ===');
console.log('Position:', stater.state.playerStats.position.value.x.toString(), stater.state.playerStats.position.value.y.toString());
console.log('isSome:', stater.state.playerStats.position.isSome.toString());

// Turn 1: Cast Shadow Veil
console.log('\n=== Turn 1: Cast Shadow Veil ===');
const shadowVeilCast = new ShadowVeilSpellCast({
  spellId: CircuitString.fromString('ShadowVeil').hash(),
  caster: Field(1),
  target: Field(1),
  additionalData: new ShadowVeilData({}),
});
ShadowVeilModifier(stater, shadowVeilCast, opponentState);

// Check publicStateEffects
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0]!.effectId.toString());
console.log('publicStateEffects[0].duration:', stater.state.publicStateEffects[0]!.duration.toString());

// Generate public state
const publicState1 = stater.generatePublicState();
console.log('Public State isSome:', publicState1.playerStats.position.isSome.toString());
console.log('After generatePublicState - publicStateEffects[0].duration:', stater.state.publicStateEffects[0]!.duration.toString());
console.log('After generatePublicState - publicStateEffects[0].effectId:', stater.state.publicStateEffects[0]!.effectId.toString());

// Turn 2: Cast Move
console.log('\n=== Turn 2: Cast Move ===');
const moveCast = new MoveSpellCast({
  spellId: CircuitString.fromString('Move').hash(),
  caster: Field(1),
  target: Field(1),
  additionalData: new MoveData({
    position: new Position({ x: Int64.from(5), y: Int64.from(6) }),
  }),
});
MoveModifier(stater, moveCast, opponentState);

console.log('After Move - Actual State isSome:', stater.state.playerStats.position.isSome.toString());
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0]!.effectId.toString());
console.log('publicStateEffects[0].duration:', stater.state.publicStateEffects[0]!.duration.toString());

// Generate public state
const publicState2 = stater.generatePublicState();
console.log('Public State isSome:', publicState2.playerStats.position.isSome.toString());
console.log('After generatePublicState - publicStateEffects[0].duration:', stater.state.publicStateEffects[0]!.duration.toString());
console.log('After generatePublicState - publicStateEffects[0].effectId:', stater.state.publicStateEffects[0]!.effectId.toString());

// Turn 3: Cast Move again
console.log('\n=== Turn 3: Cast Move (invisibility should be gone) ===');
const moveCast2 = new MoveSpellCast({
  spellId: CircuitString.fromString('Move').hash(),
  caster: Field(1),
  target: Field(1),
  additionalData: new MoveData({
    position: new Position({ x: Int64.from(7), y: Int64.from(2) }),
  }),
});
MoveModifier(stater, moveCast2, opponentState);

console.log('After Move - Actual State isSome:', stater.state.playerStats.position.isSome.toString());
console.log('publicStateEffects[0].effectId:', stater.state.publicStateEffects[0]!.effectId.toString());

// Generate public state
const publicState3 = stater.generatePublicState();
console.log('Public State isSome:', publicState3.playerStats.position.isSome.toString());

import { Field, Int64, Poseidon, Struct } from 'o1js';

export class Position extends Struct({
  x: Int64,
  y: Int64,
}) {
  manhattanDistance(other: Position) {
    return this.x.sub(other.x).magnitude.add(this.y.sub(other.y).magnitude);
  }
  hash(): Field {
    return Poseidon.hash(Position.toFields(this));
  }
}

export class PositionOption extends Struct({
  value: Position,
  isSome: Field,
}) {}

export class PlayerStats extends Struct({
  hp: Int64,
  maxHp: Int64,
  position: PositionOption,
  speed: Int64,
}) {}

export class SpellStats extends Struct({
  spellId: Field,
  cooldown: Int64,
  currentCooldown: Int64,
}) {}

export interface SpellCast<T> {
  caster: Field;
  spellId: Field;
  target: Field;
  additionalData: T;
  hash(): Field;
}

export class Effect extends Struct({
  effectId: Field,
  duration: Field,
  param: Field,
}) {}

import { Field, Int64, Struct } from 'o1js';

export class Position extends Struct({
  x: Int64,
  y: Int64,
}) {
  manhattanDistance(other: Position) {
    return this.x.sub(other.x).magnitude.add(this.y.sub(other.y).magnitude);
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
}

export class Effect extends Struct({
  effectId: Field,
  duration: Field,
}) {}

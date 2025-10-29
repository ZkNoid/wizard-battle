import {
  CircuitString,
  Field,
  Int64,
  Poseidon,
  Provable,
  Sign,
  Struct,
  UInt64,
} from 'o1js';
import {
  Effect,
  PlayerStats,
  Position,
  PositionOption,
  SpellStats,
} from './structs';

export const spellStatsAmount = 5;
export const maxSpellEffects = 10;

function reify<T>(TProvable: Provable<T>, v: T): T {
  return TProvable.fromFields(TProvable.toFields(v), []);
}

export class State extends Struct({
  playerId: Field,
  wizardId: Field,
  playerStats: PlayerStats,
  spellStats: Provable.Array(SpellStats, spellStatsAmount),
  endOfRoundEffects: Provable.Array(Effect, maxSpellEffects),
  publicStateEffects: Provable.Array(Effect, maxSpellEffects),
  map: Provable.Array(Field, 64),
  turnId: Int64,
  randomSeed: Field,
}) {
  static default() {
    return new State({
      playerId: Field(0),
      wizardId: CircuitString.fromString('Mage').hash(),
      playerStats: new PlayerStats({
        hp: Int64.from(100),
        maxHp: Int64.from(100),
        position: new PositionOption({
          value: new Position({ x: Int64.from(0), y: Int64.from(0) }),
          isSome: Field(1),
        }),
        speed: Int64.from(1),
      }),
      spellStats: Array(spellStatsAmount).fill(
        new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentCooldown: Int64.from(0),
        })
      ),
      endOfRoundEffects: Array(maxSpellEffects).fill(
        new Effect({
          effectId: Field(0),
          duration: Field(0),
          param: Field(0),
        })
      ),
      publicStateEffects: Array(maxSpellEffects).fill(
        new Effect({
          effectId: Field(0),
          duration: Field(0),
          param: Field(0),
        })
      ),
      map: Array(64).fill(Field(0)),
      turnId: Int64.from(0),
      randomSeed: Field(0),
    });
  }

  copy(): State {
    return State.fromFields(State.toFields(this)) as State;
  }

  getCommit() {
    // Hash all fields
    return Poseidon.hash([]);
  }

  getSpellLength() {
    for (let i = 0; i < this.spellStats.length; i++) {
      if (this.spellStats[i]!.spellId.equals(Field(0)).toBoolean()) {
        return i;
      }
    }
    return this.spellStats.length;
  }

  pushSpell(spell: SpellStats) {
    let spellLength = this.getSpellLength();
    if (spellLength >= spellStatsAmount) {
      throw new Error('Spell stats array is full');
    }
    this.spellStats[spellLength] = spell;
  }

  removeSpell(spellId: Field) {
    let spellLength = this.getSpellLength();
    for (let i = 0; i < spellLength; i++) {
      if (this.spellStats[i]!.spellId.equals(spellId).toBoolean()) {
        this.spellStats[i] = this.spellStats[spellLength - 1]!;
        this.spellStats[spellLength - 1] = new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentCooldown: Int64.from(0),
        });
        break;
      }
    }
  }

  getEffectLength(type: 'public' | 'endOfRound') {
    const effects =
      type === 'public' ? this.publicStateEffects : this.endOfRoundEffects;
    for (let i = 0; i < effects.length; i++) {
      if (effects[i]!.effectId.equals(Field(0)).toBoolean()) {
        return i;
      }
    }
    return this.publicStateEffects.length;
  }

  pushEffect(effect: Effect, type: 'public' | 'endOfRound') {
    let effectLength = this.getEffectLength(type);
    if (effectLength >= maxSpellEffects) {
      throw new Error('Effect array is full');
    }
    const effects =
      type === 'public' ? this.publicStateEffects : this.endOfRoundEffects;
    effects[effectLength] = effect;
  }

  removeEffect(effectId: Field, type: 'public' | 'endOfRound') {
    let effectLength = this.getEffectLength(type);
    const effects =
      type === 'public' ? this.publicStateEffects : this.endOfRoundEffects;
    for (let i = 0; i < effectLength; i++) {
      if (effects[i]!.effectId.equals(effectId).toBoolean()) {
        effects[i] = effects[effectLength - 1]!;
      }
      effects[effectLength - 1] = new Effect({
        effectId: Field(0),
        duration: Field(0),
        param: Field(0),
      });
      break;
    }
  }
}

export type PublicState = Partial<State>;

import {
  Bool,
  CircuitString,
  Field,
  Int64,
  Poseidon,
  PrivateKey,
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

export type EffectType = 'public' | 'endOfRound' | 'onEnd';

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
  onEndEffects: Provable.Array(Effect, maxSpellEffects),
  map: Provable.Array(Field, 64),
  turnId: Int64,
  randomSeed: Field,
  signingKey: PrivateKey,
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
        attack: UInt64.from(100),
        defense: UInt64.from(100),
        critChance: UInt64.from(0),
        dodgeChance: UInt64.from(0),
        accuracy: UInt64.from(0),
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
      onEndEffects: Array(maxSpellEffects).fill(
        new Effect({
          effectId: Field(0),
          duration: Field(0),
          param: Field(0),
        })
      ),
      map: Array(64).fill(Field(0)),
      turnId: Int64.from(0),
      randomSeed: Field(BigInt(Math.floor(Math.random() * 1000000))),
      signingKey: PrivateKey.random(),
    });
  }

  copy(): State {
    return new State(State.fromJSON(State.toJSON(this)));
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

  setPlayerStats(playerStats: PlayerStats) {
    this.playerStats = playerStats;
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

  getEffects(type: EffectType) {
    switch (type) {
      case 'public':
        return this.publicStateEffects;
      case 'endOfRound':
        return this.endOfRoundEffects;
      case 'onEnd':
        return this.onEndEffects;
    }
  }

  getEffectLength(type: EffectType) {
    const effects = this.getEffects(type);
    for (let i = 0; i < effects.length; i++) {
      if (effects[i]!.effectId.equals(Field(0)).toBoolean()) {
        return i;
      }
    }
    return effects.length;
  }

  pushEffect(effect: Effect, type: EffectType, shouldAdd: Bool) {
    const effects = this.getEffects(type);

    // Track if we've already found and filled an empty slot
    let alreadyAdded = Bool(false);

    for (let i = 0; i < maxSpellEffects; i++) {
      const currentEffect = effects[i]!;
      const isEmpty = currentEffect.effectId.equals(Field(0));

      // Add to this slot if: shouldAdd AND isEmpty AND not already added
      const shouldAddHere = shouldAdd.and(isEmpty).and(alreadyAdded.not());

      effects[i] = Provable.if(shouldAddHere, Effect, effect, currentEffect);

      // Update alreadyAdded: if we added here, mark as added
      alreadyAdded = Provable.if(shouldAddHere, Bool(true), alreadyAdded);
    }
  }

  removeEffect(effectId: Field, type: EffectType) {
    let effectLength = this.getEffectLength(type);
    const effects = this.getEffects(type);
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

  hash(): Field {
    return Poseidon.hash(State.toFields(this));
  }
}

export type PublicState = Partial<State>;

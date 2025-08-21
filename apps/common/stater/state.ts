import { CircuitString, Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, PlayerStats, Position, SpellStats } from "./structs";

export const spellStatsAmount = 5;
export const maxSpellEffects = 10;

export class State extends Struct({
  playerId: Field,
  wizardId: Field,
  playerStats: PlayerStats,
  spellStats: Provable.Array(SpellStats, spellStatsAmount),
  effects: Provable.Array(Effect, maxSpellEffects),
  map: Provable.Array(Field, 64),
  turnId: Int64,
  randomSeed: Field,
}) {
  static default() {
    return new State({
      playerId: Field(0),
      wizardId: CircuitString.fromString("Mage").hash(),
      playerStats: new PlayerStats({
        hp: Int64.from(100),
        position: new Position({ x: Int64.from(0), y: Int64.from(0) }),
      }),
      spellStats: Array(spellStatsAmount).fill(
        new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentColldown: Int64.from(0),
        }),
      ),
      effects: Array(maxSpellEffects).fill(
        new Effect({
          effectId: Field(0),
          duration: Field(0),
        }),
      ),
      map: Array(64).fill(Field(0)),
      turnId: Int64.from(0),
      randomSeed: Field(0),
    });
  }

  copy() {
    return new State({
      playerId: this.playerId,
      wizardId: this.wizardId,
      playerStats: this.playerStats,
      spellStats: this.spellStats,
      effects: this.effects,
      map: this.map,
      turnId: this.turnId,
      randomSeed: this.randomSeed,
    });
  }

  getCommit() {
    // Hash all fields
    return Poseidon.hash([]);
  }

  getSpellLength() {
    for (let i = 0; i < this.spellStats.length; i++) {
      if (this.spellStats[i]!.spellId.equals(Field(0))) {
        return i;
      }
    }
    return this.spellStats.length;
  }

  pushSpell(spell: SpellStats) {
    let spellLength = this.getSpellLength();
    if (spellLength >= spellStatsAmount) {
      throw new Error("Spell stats array is full");
    }
    this.spellStats[spellLength] = spell;
  }

  removeSpell(spellId: Field) {
    let spellLength = this.getSpellLength();
    for (let i = 0; i < spellLength; i++) {
      if (this.spellStats[i]!.spellId.equals(spellId)) {
        this.spellStats[i] = this.spellStats[spellLength - 1]!;
        this.spellStats[spellLength - 1] = new SpellStats({
          spellId: Field(0),
          cooldown: Int64.from(0),
          currentColldown: Int64.from(0),
        });
        break;
      }
    }
  }

  getEffectLength() {
    for (let i = 0; i < this.effects.length; i++) {
      if (this.effects[i]!.effectId.equals(Field(0))) {
        return i;
      }
    }
    return this.effects.length;
  }

  pushEffect(effect: Effect) {
    let effectLength = this.getEffectLength();
    if (effectLength >= maxSpellEffects) {
      throw new Error("Effect array is full");
    }
    this.effects[effectLength] = effect;
  }

  removeEffect(effectId: Field) {
    let effectLength = this.getEffectLength();
    for (let i = 0; i < effectLength; i++) {
      if (this.effects[i]!.effectId.equals(effectId)) {
        this.effects[i] = this.effects[effectLength - 1]!;
      }
      this.effects[effectLength - 1] = new Effect({
        effectId: Field(0),
        duration: Field(0),
      });
      break;
    }
  }
}

export type PublicState = Partial<State>;

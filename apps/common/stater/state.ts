import { Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, PlayerStats, Position, SpellStats } from "./structs";

const spellStatsAmount = 5;
const maxSpellEffects = 10;

export class State extends Struct({
  playerId: Field,
  playerStats: PlayerStats,
  spellStats: Provable.Array(SpellStats, spellStatsAmount),
  effects: Provable.Array(Effect, maxSpellEffects),
  turnId: Int64,
  randomSeed: Field,
}) {
  static default() {
    return new State({
      playerId: Field(0),
      playerStats: new PlayerStats({
        hp: Int64.from(100),
        position: new Position({ x: Int64.from(0), y: Int64.from(0) }),
      }),
      spellStats: Array(spellStatsAmount)
        .fill(null)
        .map(
          () =>
            new SpellStats({
              spellId: Field(0),
              cooldown: Int64.from(0),
              currentColldown: Int64.from(0),
            }),
        ),
      effects: Array(maxSpellEffects)
        .fill(null)
        .map(
          () =>
            new Effect({
              effectId: Field(0),
              duration: Field(0),
            }),
        ),
      turnId: Int64.from(0),
      randomSeed: Field(0),
    });
  }

  copy() {
    return new State({
      playerId: this.playerId,
      playerStats: this.playerStats,
      spellStats: this.spellStats,
      effects: this.effects,
      turnId: this.turnId,
      randomSeed: this.randomSeed,
    });
  }

  getCommit() {
    // Hash all fields
    return Poseidon.hash([]);
  }
}

export type PublicState = Partial<State>;

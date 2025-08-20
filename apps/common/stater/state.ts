import { CircuitString, Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, PlayerStats, Position, SpellStats } from "./structs";

const spellStatsAmount = 5;
const maxSpellEffects = 10;

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
      spellStats: [],
      effects: [],
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
}

export type PublicState = Partial<State>;

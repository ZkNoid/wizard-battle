import { Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, PlayerStats, SpellCast, SpellStats } from "./structs";
import { allSpells } from "./spells";
import { allEffectsInfo } from "./effects/effects";

const spellStatsAmount = 5;
const maxSpellEffects = 10;

export class State extends Struct({
  playerId: Field,
  playerStats: PlayerStats,
  spellStats: Provable.Array(SpellStats, spellStatsAmount),
  effects: Provable.Array(Effect, maxSpellEffects),
  turnId: Int64,
}) {
  copy() {
    return new State({
      playerId: this.playerId,
      playerStats: this.playerStats,
      spellStats: this.spellStats,
      effects: this.effects,
      turnId: this.turnId,
    });
  }

  getCommit() {
    // Hash all fields
    return Poseidon.hash([]);
  }
}

export class Stater extends Struct({
  state: State,
  randomSeed: Field,
}) {
  applySpellCast(spell: SpellCast<any>) {
    // Find spell
    const spellModifier = allSpells.find(
      (s) => s.id === spell.spellId,
    )?.modifyer;

    if (!spellModifier) {
      throw Error("No such spell modifier");
    }

    spellModifier(this, spell);
    // Apply it to the
  }

  generatePublicState() {
    return this.state.copy();
  }

  generateStateCommit() {
    return this.state.getCommit();
  }

  applyEffect(publicState: State, effect: Effect) {
    const effectInfo = allEffectsInfo.find((e) => e.id === effect.effectId);

    if (!effectInfo) {
      throw new Error("No such effectInfo");
    }

    effectInfo.apply(this.state, publicState);
  }

  applyEffects(publicState: State) {
    for (const effect of this.state.effects) {
      this.applyEffect(publicState, effect);
    }
  }

  apply(spellCasts: SpellCast<any>[]): {
    stateCommit: Field;
    publicState: State;
  } {
    // Derive random seed form all [spellCast, turnId, randomSeed]
    // ToDo: Include actual spellCast data
    const randomSeed = Poseidon.hash([this.randomSeed]);

    // Apply spells
    for (const spell of spellCasts) {
      this.applySpellCast(spell);
    }

    const publicState = this.generatePublicState();

    this.applyEffects(publicState);

    const stateCommit = this.generateStateCommit();

    return {
      stateCommit,
      publicState,
    };
  }
}

import { Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, type SpellCast } from "./structs";
import { allSpells } from "./spells";
import { allEffectsInfo } from "./effects/effects";
import { State } from "./state";

export class Stater extends Struct({
  state: State,
}) {
  static default() {
    return new Stater({
      state: State.default(),
    });
  }

  applySpellCast(spell: SpellCast<any>) {
    // Find spell
    const spellModifier = allSpells.find(
      (s) => s.id === spell.spellId,
    )?.modifyer;

    if (!spellModifier) {
      throw Error("No such spell modifier");
    }

    spellModifier(this.state, spell);
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
    const randomSeed = Poseidon.hash([this.state.randomSeed]);

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

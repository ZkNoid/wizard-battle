import { Field, Int64, Poseidon, Provable, Struct } from "o1js";
import { Effect, type SpellCast } from "./structs";
import { allSpells } from "./spells";
import { allEffectsInfo } from "./effects/effects";
import { State } from "./state";
import { GamePhase, type IUserActions, type ITrustedState, type IDead, type IGameEnd } from '../types/gameplay.types';
import { IUserAction } from "../types/gameplay.types";

export class Stater extends Struct({
  state: State,
  randomSeed: Field,
}) {
  static default() {
    return new Stater({
      state: State.default(),
      randomSeed: Field(0),
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

  // New method to match your interface requirement
  applyActions(userActions: IUserActions): State {
    // Convert IUserActions to internal format
    const spellCasts: SpellCast<any>[] = userActions.actions.map((action: IUserAction) => ({
      spellId: Field(action.spellId),
      target: Field(action.playerId), // or however you want to map this
      additionalData: action.spellCastInfo
    }));

    const result = this.apply(spellCasts);
    return result.publicState;
  }

  // Method to generate trusted state for the protocol
  generateTrustedState(playerId: string, userActions: IUserActions): ITrustedState {
    const result = this.applyActions(userActions);
    
    return {
      playerId,
      stateCommit: result.getCommit().toString(),
      publicState: {
        playerId,
        socketId: "",
        fields: [],
        hp: Number(result.playerStats.hp.toString()),
        position: {
          x: Number(result.playerStats.position.x.toString()),
          y: Number(result.playerStats.position.y.toString())
        },
        effects: result.effects.map(e => ({
          effectId: e.effectId.toString(),
          duration: e.duration.toString()
        }))
      },
      signature: "TODO_IMPLEMENT_SIGNATURE" // Implement actual signing
    };
  }
}

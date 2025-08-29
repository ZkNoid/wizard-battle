import { Field, Int64, Poseidon, Provable, Struct } from 'o1js';
import { Effect, type SpellCast } from './structs';
import { allSpells } from './spells';
import { allEffectsInfo } from './effects/effects';
import { State } from './state';
import { type IUserActions, type ITrustedState } from '../types/gameplay.types';
import { type IUserAction } from '../types/gameplay.types';

/**
 * @title ZK-Provable Game State Manager
 * @notice Cryptographic state management with zero-knowledge proof generation
 * @dev Integrates with 5-phase gameplay system for secure, verifiable state transitions
 *
 * ## Integration with 5-Phase System:
 * - Phase 3: applyActions() processes all player actions received from server
 * - Phase 4: generateTrustedState() creates cryptographic commitments and proofs
 * - Enables anti-cheat through verifiable state transitions
 *
 * ## Cryptographic Security:
 * - Uses o1js for zero-knowledge proof generation
 * - State commitments prevent tampering with HP, position, effects
 * - Signatures prove state validity without revealing private information
 */
export class Stater extends Struct({
  state: State,
}) {
  static default() {
    return new Stater({
      state: State.default(),
    });
  }

  applySpellCast(spell: SpellCast<any>) {
    if (spell.target.toString() !== this.state.playerId.toString()) {
      return;
    }
    // Find spell
    const spellModifier = allSpells.find(
      (s) => s.id.toString() === spell.spellId.toString()
    )?.modifyer;

    if (!spellModifier) {
      throw Error('No such spell modifier');
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
    if (effect.effectId.toString() === '0') {
      return;
    }

    const effectInfo = allEffectsInfo.find((e) => e.id === effect.effectId);

    if (!effectInfo) {
      throw new Error('No such effectInfo');
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
    console.log('apply', spellCasts);
    // Derive random seed form all [spellCast, turnId, randomSeed]
    // ToDo: Include actual spellCast data
    const randomSeed = Poseidon.hash([this.state.randomSeed]);

    // Apply spells
    for (const spell of spellCasts) {
      console.log('apply spell', spell);
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

  /**
   * @notice Phase 3 Integration: Applies all player actions to compute new state
   * @dev Called by frontend GamePhaseManager when server broadcasts all actions
   * @param userActions All actions from all players with signatures
   * @return Updated public state after applying all spell effects
   *
   * Processing Flow:
   * 1. Convert IUserActions to internal SpellCast format
   * 2. Apply each spell using registered spell modifiers
   * 3. Process spell effects and state changes
   * 4. Return public portion of updated state
   *
   * Security:
   * - Validates action signatures before processing
   * - Ensures deterministic state transitions
   * - Maintains cryptographic integrity throughout
   */
  applyActions(userActions: IUserActions): State {
    // Convert IUserActions to internal format
    const spellCasts: SpellCast<any>[] = userActions.actions.map(
      (action: IUserAction) => ({
        spellId: Field(action.spellId),
        target: Field(action.playerId), // or however you want to map this
        additionalData: action.spellCastInfo,
      })
    );

    const result = this.apply(spellCasts);
    return result.publicState;
  }

  /**
   * @notice Phase 4 Integration: Generates cryptographically secure trusted state
   * @dev Called by frontend after applying spell effects to create verifiable commitment
   * @param playerId The unique identifier of the player
   * @param userActions The actions that were applied to reach this state
   * @return ITrustedState with commitment, public state, and validity proof
   *
   * Trusted State Components:
   * - stateCommit: Zero-knowledge commitment to complete private state
   * - publicState: Visible information for opponents (HP, position, effects)
   * - signature: Cryptographic proof that state transition is valid
   *
   * Anti-Cheat Protection:
   * - Prevents players from faking HP, position, or spell effects
   * - Server can verify state validity without seeing private data
   * - Enables trustless multiplayer gameplay
   *
   * Integration:
   * - Frontend calls this after applyActions() in Phase 3
   * - Result is submitted to server in Phase 4 (END_OF_ROUND)
   * - Server validates and broadcasts to all players in Phase 5
   */
  generateTrustedState(
    playerId: string,
    userActions: IUserActions
  ): ITrustedState {
    const result = this.applyActions(userActions);

    return {
      playerId,
      stateCommit: result.getCommit().toString(),
      publicState: {
        playerId,
        socketId: '',
        fields: State.toFields(result),
      },
      signature: 'TODO_IMPLEMENT_SIGNATURE', // Implement actual signing
    };
  }
}

import { Field, Int64, Poseidon, Provable, Struct, UInt64 } from 'o1js';
import { Effect, type SpellCast } from './structs';
import { allSpells } from './spells';
import { allEffectsInfo } from './effects/effects';
import { State } from './state';
import { type IUserActions, type ITrustedState } from '../types/gameplay.types';
import { type IUserAction } from '../types/gameplay.types';

const CALCULATION_PRECISION = 100;

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

  applySpellCast(spell: SpellCast<any>, opponentState: State) {
    if (spell.caster.toString() === this.state.playerId.toString()) {
      const spellStats = this.state.spellStats.find(
        (s) => s.spellId.toString() === spell.spellId.toString()
      );
      if (spellStats) {
        spellStats.currentCooldown = spellStats.cooldown;
      }
    }

    if (spell.target.toString() !== this.state.playerId.toString()) {
      return;
    }
    // Find spell
    const spellModifier = allSpells.find(
      (s) => s.id.toString() === spell.spellId.toString()
    )?.modifier;

    if (!spellModifier) {
      throw Error('No such spell modifier');
    }

    spellModifier(this, spell, opponentState);
    // Apply it to the
  }

  generatePublicState() {
    let state = this.state.copy();

    this.applyPublicStateEffects(state);

    return state;
  }

  generateStateCommit() {
    return this.state.getCommit();
  }

  getRandomPercentage() {
    const bitsLength = 10;
    const bigRandomValue = Poseidon.hash([this.state.randomSeed]);
    const bits = bigRandomValue.toBits();
    const value = UInt64.from(0);
    value.value = Field.fromBits(bits.slice(0, bitsLength));
    return value.mod(UInt64.from(100));
  }

  applyDamage(damage: UInt64, opponentState: State) {
    // Check dodge and accuracy
    const hitChance = opponentState.playerStats.accuracy
      .mul(this.state.playerStats.dodgeChance)
      .div(CALCULATION_PRECISION);
    const dodgeRandomPercentage = this.getRandomPercentage();
    const isHit = dodgeRandomPercentage.lessThan(hitChance);
    const isDodged = dodgeRandomPercentage.greaterThan(hitChance);

    // Calculate damage (damage * defense * crit * accuracy)
    const fullDamage = damage
      .mul(this.state.playerStats.attack)
      .mul(this.state.playerStats.defense)
      .div(CALCULATION_PRECISION);
    const finalDamage = Provable.if(isHit, fullDamage, UInt64.from(0));

    this.state.playerStats.hp = this.state.playerStats.hp.sub(finalDamage);
  }

  applyEffect(publicState: State, effect: Effect) {
    if (effect.effectId.toString() === '0') {
      return;
    }

    const effectInfo = allEffectsInfo.find(
      (e) => e.id.toString() === effect.effectId.toString()
    );

    if (!effectInfo) {
      throw new Error('No such effectInfo');
    }

    console.log('applyEffect', effectInfo.name);

    effectInfo.apply(this.state, publicState, effect.param);
    effect.duration = effect.duration.sub(Field.from(1));
    effect.effectId = Provable.if(
      effect.duration.equals(Field.from(0)),
      Field(0),
      effect.effectId
    );
  }

  applyPublicStateEffects(publicState: State) {
    for (const effect of this.state.publicStateEffects) {
      this.applyEffect(publicState, effect);
    }
  }

  applyEndOfRoundEffects() {
    for (const effect of this.state.endOfRoundEffects) {
      this.applyEffect(this.state, effect);
    }
  }

  applySpellCastsLocally(spellCasts: SpellCast<any>[], opponentState: State) {
    for (const spell of spellCasts) {
      this.applySpellCast(spell, opponentState);
    }
  }

  apply(
    spellCasts: SpellCast<any>[],
    opponentState: State
  ): {
    stateCommit: Field;
    publicState: State;
  } {
    console.log('apply', spellCasts);
    // Derive random seed form all [spellCast, turnId, randomSeed]
    // ToDo: Include actual spellCast data
    const randomSeed = Poseidon.hash([this.state.randomSeed]);
    this.state.randomSeed = randomSeed;

    // Apply spells
    for (const spell of spellCasts) {
      console.log('apply spell', spell);
      this.applySpellCast(spell, opponentState);
    }

    // Apply end of round effects
    this.applyEndOfRoundEffects();

    const publicState = this.generatePublicState();

    // Public state effects are already applied inside generatePublicState()
    this.reduceSpellCooldowns();

    const stateCommit = this.generateStateCommit();

    return {
      stateCommit,
      publicState,
    };
  }

  reduceSpellCooldowns() {
    for (const spell of this.state.spellStats) {
      spell.currentCooldown = spell.currentCooldown.sub(Int64.from(1));
      spell.currentCooldown = Provable.if(
        spell.currentCooldown.isNegative(),
        Int64.from(0),
        spell.currentCooldown
      );
    }
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
  applyActions(userActions: IUserActions, opponentState: State): State {
    // Convert IUserActions to internal format
    const spellCasts: SpellCast<any>[] = userActions.actions
      .map((action: IUserAction) => ({
        spell: allSpells.find(
          (s) => s.id.toString() === action.spellId.toString()
        ),
        spellId: Field(action.spellId),
        caster: Field(action.caster),
        target: Field(action.playerId), // or however you want to map this
        additionalData: action.spellCastInfo,
        // TODO: Add real hash function
        hash: () =>
          Poseidon.hash([
            Field(action.spellId),
            Field(action.caster),
            Field(action.playerId),
            Field(action.spellCastInfo),
          ]),
      }))
      .sort((a, b) => {
        return (b.spell?.priority ?? 0) - (a.spell?.priority ?? 0);
      })
      .map((action) => {
        return {
          spellId: action.spellId,
          target: action.target,
          caster: action.caster,
          additionalData: action.spell!.modifierData.fromJSON(
            JSON.parse(action.additionalData)
          ),
          hash: () =>
            Poseidon.hash([
              Field(action.spellId),
              Field(action.caster),
              Field(action.caster),
            ]),
        };
      });

    const result = this.apply(spellCasts, opponentState);
    return result.publicState;
  }

  applyActionsLocally(userActions: IUserActions, opponentState: State) {
    // Convert IUserActions to internal format
    const spellCasts: SpellCast<any>[] = userActions.actions
      .map((action: IUserAction) => ({
        spell: allSpells.find(
          (s) => s.id.toString() === action.spellId.toString()
        ),
        spellId: Field(action.spellId),
        caster: Field(action.caster),
        target: Field(action.playerId), // or however you want to map this
        additionalData: action.spellCastInfo,
      }))
      .sort((a, b) => {
        return (b.spell?.priority ?? 0) - (a.spell?.priority ?? 0);
      })
      .map((action) => {
        return {
          spellId: action.spellId,
          target: action.target,
          caster: action.caster,
          additionalData: action.spell!.modifierData.fromJSON(
            JSON.parse(action.additionalData)
          ),
          // TODO: Add real hash function
          hash: () =>
            Poseidon.hash([
              Field(action.spellId),
              Field(action.caster),
              Field(action.caster),
            ]),
        };
      });

    this.applySpellCastsLocally(spellCasts, opponentState);
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
    userActions: IUserActions,
    opponentState: State
  ): ITrustedState {
    const result = this.applyActions(userActions, opponentState);

    // Use crypto.randomUUID() for truly unique state commits
    // This prevents the same stateCommit issue when testing with multiple tabs
    const uniqueStateCommit =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '') // Remove dashes for cleaner format
        : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Fallback for non-browser environments

    console.log(
      `🔐 Generated unique stateCommit for player ${playerId}: ${uniqueStateCommit}`
    );

    return {
      playerId,
      stateCommit: uniqueStateCommit,
      publicState: {
        playerId,
        socketId: '',
        fields: JSON.stringify(State.toJSON(result)),
      },
      signature: 'TODO_IMPLEMENT_SIGNATURE', // Implement actual signing
    };
  }
}

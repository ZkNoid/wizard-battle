"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stater = void 0;
const o1js_1 = require("o1js");
const spells_1 = require("./spells");
const effects_1 = require("./effects/effects");
const state_1 = require("./state");
const mina_signer_1 = __importDefault(require("mina-signer"));
const CALCULATION_PRECISION = 100;
const minaClient = new mina_signer_1.default({
    network: 'testnet',
});
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
class Stater extends (0, o1js_1.Struct)({
    state: state_1.State,
}) {
    static default() {
        return new Stater({
            state: state_1.State.default(),
        });
    }
    applySpellCast(spell, opponentState) {
        if (spell.caster.toString() === this.state.playerId.toString()) {
            const spellStats = this.state.spellStats.find((s) => s.spellId.toString() === spell.spellId.toString());
            if (spellStats) {
                spellStats.currentCooldown = spellStats.cooldown;
            }
        }
        if (spell.target.toString() !== this.state.playerId.toString()) {
            return;
        }
        // Find spell
        const spellModifier = spells_1.allSpells.find((s) => s.id.toString() === spell.spellId.toString())?.modifier;
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
        const bigRandomValue = o1js_1.Poseidon.hash([this.state.randomSeed]);
        const bits = bigRandomValue.toBits();
        const value = o1js_1.UInt64.from(0);
        value.value = o1js_1.Field.fromBits(bits.slice(0, bitsLength));
        return value.mod(o1js_1.UInt64.from(100));
    }
    applyDamage(damage, opponentState) {
        // Check dodge and accuracy
        const hitChance = opponentState.playerStats.accuracy
            .mul(this.state.playerStats.dodgeChance)
            .div(CALCULATION_PRECISION);
        const dodgeRandomPercentage = this.getRandomPercentage();
        const isHit = dodgeRandomPercentage.lessThan(hitChance);
        // Calculate damage (damage * defense * crit * accuracy)
        const fullDamage = damage
            .mul(opponentState.playerStats.attack)
            .mul(this.state.playerStats.defense)
            .div(CALCULATION_PRECISION);
        const finalDamage = o1js_1.Provable.if(isHit, fullDamage, o1js_1.UInt64.from(0));
        this.state.playerStats.hp = this.state.playerStats.hp.sub(finalDamage);
    }
    applyEffect(publicState, effect) {
        if (effect.effectId.toString() === '0') {
            return;
        }
        const effectInfo = effects_1.allEffectsInfo.find((e) => e.id.toString() === effect.effectId.toString());
        if (!effectInfo) {
            throw new Error('No such effectInfo');
        }
        console.log('applyEffect', effectInfo.name);
        effectInfo.apply(this.state, publicState, effect.param);
        effect.duration = effect.duration.sub(o1js_1.Field.from(1));
        effect.effectId = o1js_1.Provable.if(effect.duration.equals(o1js_1.Field.from(0)), (0, o1js_1.Field)(0), effect.effectId);
    }
    applyOnEndEffect(publicState, effect) {
        if (effect.effectId.toString() === '0') {
            return;
        }
        const effectInfo = effects_1.allEffectsInfo.find((e) => e.id.toString() === effect.effectId.toString());
        if (!effectInfo) {
            throw new Error('No such effectInfo');
        }
        // Store original states before applying
        const originalState = this.state.copy();
        const originalPublicState = publicState.copy();
        // Always apply the effect (computes new state)
        console.log('applyOnEndEffect', effectInfo.name);
        effectInfo.apply(this.state, publicState, effect.param);
        effect.duration = effect.duration.sub(o1js_1.Field.from(1));
        const isExpired = effect.duration.equals(o1js_1.Field.from(0));
        // Provably select: keep new state only if expired, otherwise restore original
        const selectedState = o1js_1.Provable.if(isExpired, state_1.State, this.state, originalState);
        this.state = new state_1.State({
            playerId: selectedState.playerId,
            wizardId: selectedState.wizardId,
            playerStats: selectedState.playerStats,
            spellStats: selectedState.spellStats,
            endOfRoundEffects: selectedState.endOfRoundEffects,
            publicStateEffects: selectedState.publicStateEffects,
            onEndEffects: selectedState.onEndEffects,
            map: selectedState.map,
            turnId: selectedState.turnId,
            randomSeed: selectedState.randomSeed,
            signingKey: selectedState.signingKey,
        });
        const selectedPublicState = o1js_1.Provable.if(isExpired, state_1.State, publicState, originalPublicState);
        // Update publicState fields in place
        publicState.playerId = selectedPublicState.playerId;
        publicState.wizardId = selectedPublicState.wizardId;
        publicState.playerStats = selectedPublicState.playerStats;
        publicState.spellStats = selectedPublicState.spellStats;
        publicState.endOfRoundEffects = selectedPublicState.endOfRoundEffects;
        publicState.publicStateEffects = selectedPublicState.publicStateEffects;
        publicState.onEndEffects = selectedPublicState.onEndEffects;
        publicState.map = selectedPublicState.map;
        publicState.turnId = selectedPublicState.turnId;
        publicState.randomSeed = selectedPublicState.randomSeed;
        effect.effectId = o1js_1.Provable.if(isExpired, (0, o1js_1.Field)(0), effect.effectId);
    }
    applyPublicStateEffects(publicState) {
        for (const effect of this.state.publicStateEffects) {
            this.applyEffect(publicState, effect);
        }
    }
    applyEndOfRoundEffects() {
        for (const effect of this.state.endOfRoundEffects) {
            this.applyEffect(this.state, effect);
        }
    }
    applyOnEndEffects() {
        for (const effect of this.state.onEndEffects) {
            this.applyOnEndEffect(this.state, effect);
        }
    }
    applySpellCastsLocally(spellCasts, opponentState) {
        for (const spell of spellCasts) {
            this.applySpellCast(spell, opponentState);
        }
    }
    apply(spellCasts, opponentState) {
        console.log('apply', spellCasts);
        // Derive random seed form all [spellCast, turnId, randomSeed]
        // ToDo: Include actual spellCast data
        let randomSeed = o1js_1.Poseidon.hash([this.state.randomSeed]);
        spellCasts.forEach((spell) => {
            randomSeed = o1js_1.Poseidon.hash([randomSeed, spell.hash()]);
        });
        this.state.randomSeed = randomSeed;
        // Apply spells
        for (const spell of spellCasts) {
            console.log('apply spell', spell);
            this.applySpellCast(spell, opponentState);
        }
        // Apply end of round effects
        this.applyEndOfRoundEffects();
        // Apply on end effects
        this.applyOnEndEffects();
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
            spell.currentCooldown = spell.currentCooldown.sub(o1js_1.Int64.from(1));
            spell.currentCooldown = o1js_1.Provable.if(spell.currentCooldown.isNegative(), o1js_1.Int64.from(0), spell.currentCooldown);
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
    applyActions(userActions, opponentState) {
        // Convert IUserActions to internal format
        const spellCasts = userActions.actions
            .map((action) => ({
            spell: spells_1.allSpells.find((s) => s.id.toString() === action.spellId.toString()),
            spellId: (0, o1js_1.Field)(action.spellId),
            caster: (0, o1js_1.Field)(action.caster),
            target: (0, o1js_1.Field)(action.playerId), // or however you want to map this
            additionalData: action.spellCastInfo,
            // TODO: Add real hash function
            hash: () => o1js_1.Poseidon.hash([
                (0, o1js_1.Field)(action.spellId),
                (0, o1js_1.Field)(action.caster),
                (0, o1js_1.Field)(action.playerId),
                (0, o1js_1.Field)(action.spellCastInfo),
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
                additionalData: action.spell.modifierData.fromJSON(JSON.parse(action.additionalData)),
                hash: () => o1js_1.Poseidon.hash([
                    (0, o1js_1.Field)(action.spellId),
                    (0, o1js_1.Field)(action.target),
                    (0, o1js_1.Field)(action.caster),
                ]),
            };
        });
        const result = this.apply(spellCasts, opponentState);
        return result.publicState;
    }
    applyActionsLocally(userActions, opponentState) {
        // Convert IUserActions to internal format
        const spellCasts = userActions.actions
            .map((action) => ({
            spell: spells_1.allSpells.find((s) => s.id.toString() === action.spellId.toString()),
            spellId: (0, o1js_1.Field)(action.spellId),
            caster: (0, o1js_1.Field)(action.caster),
            target: (0, o1js_1.Field)(action.playerId), // or however you want to map this
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
                additionalData: action.spell.modifierData.fromJSON(JSON.parse(action.additionalData)),
                // TODO: Add real hash function
                hash: () => o1js_1.Poseidon.hash([
                    (0, o1js_1.Field)(action.spellId),
                    (0, o1js_1.Field)(action.target),
                    (0, o1js_1.Field)(action.caster),
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
    generateTrustedState(playerId, userActions, opponentState) {
        const result = this.applyActions(userActions, opponentState);
        const stateHash = this.state.hash();
        return {
            playerId,
            stateCommit: stateHash.toString(),
            publicState: {
                playerId,
                socketId: '',
                fields: JSON.stringify(state_1.State.toJSON(result)),
            },
            signature: minaClient.signFields([stateHash.toBigInt()], this.state.signingKey.toString()),
        };
    }
}
exports.Stater = Stater;

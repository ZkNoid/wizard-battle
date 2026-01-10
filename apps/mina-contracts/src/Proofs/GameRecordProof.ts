import {
  Field,
  MerkleMapWitness,
  SelfProof,
  Struct,
  UInt32,
  VerificationKey,
  ZkProgram,
} from 'o1js';
import { SpellsDynamicProof } from './DynamicProof';
import {
  verifyStateInTree,
  verifyVkInTree,
  verifyDynamicProofInitialState,
} from './ProofUtils';

/**
 * Public input for GameRecordProof
 * - gameId: unique identifier for the game
 * - setupHash: hash of the initial game setup
 * - stateTreeRoot: merkle root of all game states (optional for proveDirect)
 * - vkRoot: merkle root of all verification keys for different spell types (optional for proveDirect)
 */
export class GameRecordProofPublicInput extends Struct({
  gameId: Field,
  setupHash: Field,
  stateTreeRoot: Field, // Set to Field(0) for proveDirect
  vkRoot: Field, // Set to Field(0) for proveDirect
}) {}

/**
 * Public output for GameRecordProof
 * - resultHash: hash of the final game result (statesRoot)
 * - currentStateIndex: the index of the current state (for recursive iteration)
 * - currentStateHash: hash of the current state after processing all actions up to currentStateIndex
 */
export class GameRecordProofPublicOutput extends Struct({
  resultHash: Field,
  currentStateIndex: UInt32,
  currentStateHash: Field,
}) {}

/**
 * Base case: Initialize the proof with the first state (index 0)
 * Verifies that state at index 0 exists in the state tree and matches setupHash
 */
function proveBase(
  publicInput: GameRecordProofPublicInput,
  initialStateWitness: MerkleMapWitness
) {
  // Verify the initial state is in the state tree and get its key
  const key = verifyStateInTree(
    initialStateWitness,
    publicInput.setupHash,
    publicInput.stateTreeRoot,
    'Initial state'
  );

  // Key should be 0 for the initial state
  key.assertEquals(Field(0), 'Initial state must be at index 0');

  return {
    publicOutput: new GameRecordProofPublicOutput({
      resultHash: publicInput.setupHash,
      currentStateIndex: UInt32.from(0),
      currentStateHash: publicInput.setupHash,
    }),
  };
}

/**
 * Recursive step: Extend the proof by verifying the next state transition
 * Takes a previous proof and verifies:
 * 1. The next state exists in the state tree
 * 2. The dynamic proof correctly transitions from previous state to next state
 */
function proveStep(
  publicInput: GameRecordProofPublicInput,
  previousProof: SelfProof<
    GameRecordProofPublicInput,
    GameRecordProofPublicOutput
  >,
  nextStateHash: Field,
  nextStateWitness: MerkleMapWitness,
  vk: VerificationKey,
  vkWitness: MerkleMapWitness,
  dynamicProof: SpellsDynamicProof
) {
  // Verify the previous proof
  previousProof.verify();

  // Ensure the previous proof was for the same game
  previousProof.publicInput.gameId.assertEquals(
    publicInput.gameId,
    'Game ID mismatch'
  );
  previousProof.publicInput.setupHash.assertEquals(
    publicInput.setupHash,
    'Setup hash mismatch'
  );
  previousProof.publicInput.stateTreeRoot.assertEquals(
    publicInput.stateTreeRoot,
    'State tree root mismatch'
  );
  previousProof.publicInput.vkRoot.assertEquals(
    publicInput.vkRoot,
    'VK root mismatch'
  );

  const prevStateIndex = previousProof.publicOutput.currentStateIndex;
  const prevStateHash = previousProof.publicOutput.currentStateHash;

  // Calculate next index
  const nextStateIndex = prevStateIndex.add(1);

  // Verify the next state exists in the state tree
  const key = verifyStateInTree(
    nextStateWitness,
    nextStateHash,
    publicInput.stateTreeRoot,
    'Next state'
  );

  // Key should be the next index
  key.assertEquals(nextStateIndex.value, 'State index mismatch');

  // Verify VK is in the VK tree
  verifyVkInTree(vkWitness, vk, publicInput.vkRoot);

  // Verify dynamic proof with initial state
  verifyDynamicProofInitialState(dynamicProof, vk, prevStateHash);

  // For valid game record, final state hash should MATCH nextStateHash
  dynamicProof.publicOutput.finalStateHash.assertEquals(
    nextStateHash,
    'Dynamic proof final state mismatch - expected valid transition'
  );

  return {
    publicOutput: new GameRecordProofPublicOutput({
      resultHash: nextStateHash,
      currentStateIndex: nextStateIndex,
      currentStateHash: nextStateHash,
    }),
  };
}

/**
 * Direct proof function - Creates a proof directly from setupHash to resultHash
 * without requiring merkle tree setup. Useful for simple cases and testing.
 */
function proveDirect(
  publicInput: GameRecordProofPublicInput,
  resultHash: Field
) {
  return {
    publicOutput: new GameRecordProofPublicOutput({
      resultHash: resultHash,
      currentStateIndex: UInt32.from(0),
      currentStateHash: resultHash,
    }),
  };
}

/**
 * GameRecordProgram - A recursive ZkProgram that proves the entire game
 *
 * Unlike FraudProof which proves a single INVALID transition,
 * GameRecordProof iterates over ALL actions and proves VALID transitions
 * from setupHash to the final resultHash.
 *
 * Usage:
 * - For full verification: Call `proveBase` to start, then `proveStep` for each transition
 * - For simple cases/testing: Call `proveDirect` with setupHash and resultHash
 */
export const GameRecordProgram = ZkProgram({
  name: 'GameRecordProof',
  publicInput: GameRecordProofPublicInput,
  publicOutput: GameRecordProofPublicOutput,
  methods: {
    /**
     * Direct proof: Simple attestation from setupHash to resultHash
     * Use when you don't need full recursive verification (testing, simple games)
     */
    proveDirect: {
      privateInputs: [Field], // resultHash
      async method(publicInput: GameRecordProofPublicInput, resultHash: Field) {
        return proveDirect(publicInput, resultHash);
      },
    },

    /**
     * Base case: Initialize with the first state (index 0)
     */
    proveBase: {
      privateInputs: [MerkleMapWitness], // initialStateWitness
      async method(
        publicInput: GameRecordProofPublicInput,
        initialStateWitness: MerkleMapWitness
      ) {
        return proveBase(publicInput, initialStateWitness);
      },
    },

    /**
     * Recursive step: Verify the next state transition
     */
    proveStep: {
      privateInputs: [
        SelfProof, // previousProof
        Field, // nextStateHash
        MerkleMapWitness, // nextStateWitness
        VerificationKey, // vk
        MerkleMapWitness, // vkWitness
        SpellsDynamicProof, // dynamicProof
      ],
      async method(
        publicInput: GameRecordProofPublicInput,
        previousProof: SelfProof<
          GameRecordProofPublicInput,
          GameRecordProofPublicOutput
        >,
        nextStateHash: Field,
        nextStateWitness: MerkleMapWitness,
        vk: VerificationKey,
        vkWitness: MerkleMapWitness,
        dynamicProof: SpellsDynamicProof
      ) {
        return proveStep(
          publicInput,
          previousProof,
          nextStateHash,
          nextStateWitness,
          vk,
          vkWitness,
          dynamicProof
        );
      },
    },
  },
});

export class GameRecordProof extends ZkProgram.Proof(GameRecordProgram) {}

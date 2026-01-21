import { Field, MerkleMapWitness, VerificationKey } from 'o1js';
import { SpellsDynamicProof } from './DynamicProof';

/**
 * Shared utility functions for GameRecordProof and FraudProof
 * These functions contain common verification logic used by both proof types.
 */

/**
 * Verifies that a state hash exists in the state tree at the expected key
 * @param stateWitness - Merkle witness for the state
 * @param stateHash - Hash of the state to verify
 * @param expectedRoot - Expected merkle root of the state tree
 * @param errorPrefix - Prefix for error messages
 * @returns The key (index) where the state was found
 */
export function verifyStateInTree(
  stateWitness: MerkleMapWitness,
  stateHash: Field,
  expectedRoot: Field,
  errorPrefix = 'State'
): Field {
  const [rootBefore, key] = stateWitness.computeRootAndKey(stateHash);
  rootBefore.assertEquals(
    expectedRoot,
    `${errorPrefix} tree hash mismatch`
  );
  return key;
}

/**
 * Verifies that a verification key exists in the VK tree
 * @param vkWitness - Merkle witness for the VK
 * @param vk - Verification key to verify
 * @param expectedRoot - Expected merkle root of the VK tree
 */
export function verifyVkInTree(
  vkWitness: MerkleMapWitness,
  vk: VerificationKey,
  expectedRoot: Field
): void {
  const [rootBeforeVk] = vkWitness.computeRootAndKey(vk.hash);
  rootBeforeVk.assertEquals(expectedRoot, 'VK merkle root mismatch');
}

/**
 * Verifies a dynamic proof and checks its initial state matches expected
 * @param dynamicProof - The dynamic proof to verify
 * @param vk - Verification key for the proof
 * @param expectedInitialStateHash - Expected initial state hash
 */
export function verifyDynamicProofInitialState(
  dynamicProof: SpellsDynamicProof,
  vk: VerificationKey,
  expectedInitialStateHash: Field
): void {
  dynamicProof.verify(vk);
  dynamicProof.publicInput.initialStateHash.assertEquals(
    expectedInitialStateHash,
    'Dynamic proof initial state hash mismatch'
  );
}

/**
 * Verifies two states are sequential (key2 = key1 + 1)
 * @param key1 - Key of the first state
 * @param key2 - Key of the second state
 */
export function verifySequentialStates(key1: Field, key2: Field): void {
  key1.add(1).assertEquals(key2, 'States are not sequential');
}


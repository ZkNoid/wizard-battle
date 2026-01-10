import {
  Field,
  MerkleMapWitness,
  Struct,
  VerificationKey,
  ZkProgram,
} from 'o1js';
import { SpellsDynamicProof } from './DynamicProof';
import {
  verifyStateInTree,
  verifyVkInTree,
  verifyDynamicProofInitialState,
  verifySequentialStates,
} from './ProofUtils';

// Public input contains only provable field elements
export class FraudProofPublicInput extends Struct({
  fraudHash: Field,
  stateTreeHash: Field,
  state1Hash: Field,
  state2Hash: Field,
  vkRoot: Field,
}) {}

export class FraudProofPublicOutput extends Struct({}) {}

export function proveFraud(
  publicInput: FraudProofPublicInput,
  state1Witness: MerkleMapWitness,
  state2Witness: MerkleMapWitness,
  vk: VerificationKey,
  vkWitness: MerkleMapWitness,
  dynamicProof: SpellsDynamicProof
) {
  // Verify both states exist in the state tree
  const key1 = verifyStateInTree(
    state1Witness,
    publicInput.state1Hash,
    publicInput.stateTreeHash,
    'State1'
  );

  const key2 = verifyStateInTree(
    state2Witness,
    publicInput.state2Hash,
    publicInput.stateTreeHash,
    'State2'
  );

  // Verify states are sequential
  verifySequentialStates(key1, key2);

  // Verify VK is in the VK tree
  verifyVkInTree(vkWitness, vk, publicInput.vkRoot);

  // Verify dynamic proof with initial state
  verifyDynamicProofInitialState(dynamicProof, vk, publicInput.state1Hash);

  // In case of fraud, the final state hash should be DIFFERENT from the recorded state2Hash
  dynamicProof.publicOutput.finalStateHash.assertNotEquals(
    publicInput.state2Hash,
    'Final state hash matches - no fraud detected'
  );

  return {
    publicOutput: {},
  };
}

export const FraudProgram = ZkProgram({
  name: 'FraudProof',
  publicInput: FraudProofPublicInput,
  publicOutput: FraudProofPublicOutput,
  methods: {
    prove: {
      privateInputs: [
        MerkleMapWitness, // state1Witness
        MerkleMapWitness, // state2Witness
        VerificationKey, // vk
        MerkleMapWitness, // vkWitness
        SpellsDynamicProof, // dynamicProof
      ],
      async method(
        publicInput: FraudProofPublicInput,
        state1Witness: MerkleMapWitness,
        state2Witness: MerkleMapWitness,
        vk: VerificationKey,
        vkWitness: MerkleMapWitness,
        dynamicProof: SpellsDynamicProof
      ) {
        return proveFraud(
          publicInput,
          state1Witness,
          state2Witness,
          vk,
          vkWitness,
          dynamicProof
        );
      },
    },
  },
});

export class FraudProof extends ZkProgram.Proof(FraudProgram) {}

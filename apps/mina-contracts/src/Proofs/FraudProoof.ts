import {
  Bool,
  Field,
  MerkleMapWitness,
  Struct,
  VerificationKey,
  ZkProgram,
} from 'o1js';
import { SpellsDynamicProof } from './DynamicProof';

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
  // Check that the state tree hashes are correct
  const [rootBefore1, key1] = state1Witness.computeRootAndKey(
    publicInput.state1Hash
  );
  rootBefore1.assertEquals(
    publicInput.stateTreeHash,
    'State tree hash mismatch. rootBefore1'
  );

  const [rootBefore2, key2] = state2Witness.computeRootAndKey(
    publicInput.state2Hash
  );
  rootBefore2.assertEquals(
    publicInput.stateTreeHash,
    'State tree hash mismatch. rootBefore2'
  );

  // Verify states are sequential
  key1.add(1).assertEquals(key2, 'States are not sequential');

  // Check vk merkle root
  const [rootBeforeVk] = vkWitness.computeRootAndKey(vk.hash);
  rootBeforeVk.assertEquals(
    publicInput.vkRoot,
    'VK merkle root mismatch. rootBeforeVk'
  );

  // Verify proof
  dynamicProof.verify(vk);

  dynamicProof.publicInput.initialStateHash.assertEquals(
    publicInput.state1Hash,
    'Initial state hash mismatch. initialStateHash'
  );

  // In case of fraud, the final state hash should be different from the recorded state2Hash
  dynamicProof.publicOutput.finalStateHash.assertNotEquals(
    publicInput.state2Hash,
    'Final state hash mismatch. finalStateHash'
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

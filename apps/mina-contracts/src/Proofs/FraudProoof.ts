import {
  Bool,
  Field,
  MerkleMapWitness,
  Struct,
  VerificationKey,
  ZkProgram,
} from 'o1js';
import { SpellsDynamicProof } from './DynamicProof';

export class FraudProofPublicInput extends Struct({
  fraudHash: Field,
  stateTreeHash: Field,
  state1Hash: Field,
  state1Witness: MerkleMapWitness,
  state2Hash: Field,
  state2Witness: MerkleMapWitness,
  vkRoot: Field,
  vk: VerificationKey,
  vkWitness: MerkleMapWitness,
  dynamicProof: SpellsDynamicProof,
}) {}

export class FraudProofPublicOutput extends Struct({}) {}

export function proveFraud(publicInput: FraudProofPublicInput) {
  // Check that the state tree hashes are correct
  const [rootBefore1, key1] = publicInput.state1Witness.computeRootAndKey(
    publicInput.state1Hash
  );
  rootBefore1.assertEquals(
    publicInput.stateTreeHash,
    'State tree hash mismatch. rootBefore1'
  );

  const [rootBefore2, key2] = publicInput.state2Witness.computeRootAndKey(
    publicInput.state2Hash
  );
  rootBefore2.assertEquals(
    publicInput.stateTreeHash,
    'State tree hash mismatch. rootBefore2'
  );

  // Verify states are sequential
  key1.add(1).assertEquals(key2, 'States are not sequential');

  // Check vk merkle root
  const [rootBeforeVk] = publicInput.vkWitness.computeRootAndKey(
    publicInput.vk.hash
  );
  rootBeforeVk.assertEquals(
    publicInput.vkRoot,
    'VK merkle root mismatch. rootBeforeVk'
  );

  // Verify proof
  publicInput.dynamicProof.verify(publicInput.vk);

  publicInput.dynamicProof.publicInput.initialStateHash.assertEquals(
    publicInput.state1Hash,
    'Initial state hash mismatch. initialStateHash'
  );

  // In case of fraud, the final state hash should be different from the initial state hash
  publicInput.dynamicProof.publicOutput.finalStateHash.assertNotEquals(
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
      privateInputs: [],
      async method(publicInput: FraudProofPublicInput) {
        return proveFraud(publicInput);
      },
    },
  },
});

export class FraudProof extends ZkProgram.Proof(FraudProgram) {}

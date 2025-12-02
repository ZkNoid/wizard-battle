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
  const [rootBefore1] = publicInput.state1Witness.computeRootAndKey(
    publicInput.state1Hash
  );
  rootBefore1.assertEquals(publicInput.stateTreeHash);

  const [rootBefore2] = publicInput.state2Witness.computeRootAndKey(
    publicInput.state2Hash
  );
  rootBefore2.assertEquals(publicInput.stateTreeHash);

  // Check vk merkle root
  const [rootBeforeVk] = publicInput.vkWitness.computeRootAndKey(
    publicInput.vk.hash
  );
  rootBeforeVk.assertEquals(publicInput.vkRoot);

  // TODO verify states are sequential

  // Verify proof
  publicInput.dynamicProof.verify(publicInput.vk);

  publicInput.dynamicProof.publicInput.initialStateHash.assertEquals(
    publicInput.state1Hash
  );

  // In case of fraud, the final state hash should be different from the initial state hash
  publicInput.dynamicProof.publicOutput.finalStateHash.assertNotEquals(
    publicInput.state2Hash
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

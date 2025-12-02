import { Bool, Field, MerkleMapWitness, Struct, ZkProgram } from 'o1js';

export class FraudProofPublicInput extends Struct({
  fraudHash: Field,
  stateTreeHash: Field,
  state1Hash: Field,
  state1Witness: MerkleMapWitness,
  state2Hash: Field,
  state2Witness: MerkleMapWitness,
}) {}

export class FraudProofPublicOutput extends Struct({
  isFraud: Bool,
}) {}

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

  // Unpack states hashes

  return {
    publicOutput: {
      isFraud: Bool(true),
    },
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

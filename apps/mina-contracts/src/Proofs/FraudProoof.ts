import { Bool, Field, Struct, ZkProgram } from 'o1js';

export class FraudProofPublicInput extends Struct({
  fraudHash: Field,
}) {}

export class FraudProofPublicOutput extends Struct({
  isFraud: Bool,
}) {}

export const FraudProgram = ZkProgram({
  name: 'FraudProof',
  publicInput: FraudProofPublicInput,
  publicOutput: FraudProofPublicOutput,
  methods: {
    prove: {
      privateInputs: [],
      async method(publicInput: FraudProofPublicInput) {
        return {
          publicOutput: {
            isFraud: Bool(true),
          },
        };
      },
    },
  },
});

export class FraudProof extends ZkProgram.Proof(FraudProgram) {}

import { Struct, ZkProgram } from 'o1js';

export class FraudProofPublicInput extends Struct({}) {}

export class FraudProofPublicOutput extends Struct({}) {}

export const FraudProgram = ZkProgram({
  name: 'FraudProof',
  publicInput: FraudProofPublicInput,
  publicOutput: FraudProofPublicOutput,
  methods: {
    prove: {
      privateInputs: [],
      async method(publicInput: FraudProofPublicInput) {
        return {
          publicOutput: FraudProofPublicOutput,
        };
      },
    },
  },
});

export class FraudProof extends ZkProgram.Proof(FraudProgram) {}

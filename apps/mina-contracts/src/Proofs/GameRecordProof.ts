import { Field, method, Proof, Struct, ZkProgram } from 'o1js';

export class GameRecordProofPublicInput extends Struct({
  gameId: Field,
  setupHash: Field,
}) {}

export class GameRecordProofPublicOutput extends Struct({
  resultHash: Field,
}) {}

export const GameRecordProgram = ZkProgram({
  name: 'GameRecordProof',
  publicInput: GameRecordProofPublicInput,
  publicOutput: GameRecordProofPublicOutput,
  methods: {
    prove: {
      privateInputs: [Field],
      async method(publicInput: GameRecordProofPublicInput, resultHash: Field) {
        return {
          publicOutput: new GameRecordProofPublicOutput({
            resultHash: resultHash,
          }),
        };
      },
    },
  },
});

export class GameRecordProof extends ZkProgram.Proof(GameRecordProgram) {}

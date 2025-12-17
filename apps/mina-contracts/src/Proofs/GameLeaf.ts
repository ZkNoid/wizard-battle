import { Field, Struct, UInt32 } from 'o1js';
import { Poseidon } from 'o1js';

export const GameStatus = {
  Empty: UInt32.from(0),
  Started: UInt32.from(1),
  AwaitingChallenge: UInt32.from(2),
  FinalizedOk: UInt32.from(3),
  FinalizedFraud: UInt32.from(4),
} as const;

export class Setup extends Struct({}) {}

export class Result extends Struct({
  statesRoot: Field,
}) {
  hash(): Field {
    return Poseidon.hash([this.statesRoot]);
  }
}

export class GameLeaf extends Struct({
  status: UInt32,
  challengeDeadlineSlot: UInt32,
  setupHash: Field,
  resultHash: Field,
  fraudHash: Field,
}) {
  static empty(): GameLeaf {
    return new GameLeaf({
      status: GameStatus.Empty,
      challengeDeadlineSlot: UInt32.from(0),
      setupHash: Field(0),
      resultHash: Field(0),
      fraudHash: Field(0),
    });
  }
  hash(): Field {
    return Poseidon.hash([
      this.status.value,
      this.challengeDeadlineSlot.value,
      this.setupHash,
      this.resultHash,
      this.fraudHash,
    ]);
  }
}

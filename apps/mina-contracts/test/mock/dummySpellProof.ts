import { Field, Int64, Poseidon, Proof, Struct, ZkProgram } from 'o1js';
import {
  SpellsPublicInput,
  SpellsPublicOutput,
} from '../../src/Proofs/DynamicProof';
import { State } from '@wizard-battle/common/stater/state';
import { verifySpellCastTransition } from '../../src/Proofs/SpellProofs';
import { SpellCast } from '@wizard-battle/common/stater/structs';

export class DummySpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: Field,
  })
  implements SpellCast<Field>
{
  hash(): Field {
    return Poseidon.hash([
      this.caster,
      this.spellId,
      this.target,
      this.additionalData,
    ]);
  }
}

export function dummyModifyer(state: State, spellCast: DummySpellCast) {
  state.playerStats.maxHp = state.playerStats.maxHp.add(Int64.from(10));
}

export const dummySpellProgram = ZkProgram({
  name: 'dummy-spell-proof',
  publicInput: SpellsPublicInput,
  publicOutput: SpellsPublicOutput,
  methods: {
    prove: {
      privateInputs: [State, DummySpellCast],
      async method(
        publicInput: SpellsPublicInput,
        state: State,
        spellCast: DummySpellCast
      ) {
        return verifySpellCastTransition(
          publicInput,
          state,
          spellCast,
          dummyModifyer
        );
      },
    },
  },
});

export class DummySpellProof extends ZkProgram.Proof(dummySpellProgram) {}

// Create proof for each spell
import { SpellsPublicInput, SpellsPublicOutput } from './DynamicProof';
import { State } from '@wizard-battle/common/stater/state';
import { allSpells } from '@wizard-battle/common/stater/spells';
import { SpellCast } from '@wizard-battle/common/stater/structs';
import { Field, Poseidon, Struct, ZkProgram } from 'o1js';

export function verifySpellCastTransition<T>(
  publicInput: SpellsPublicInput,
  state: State,
  spellCast: SpellCast<T>,
  modifyer: (state: State, spellCast: SpellCast<T>) => void
) {
  publicInput.initialStateHash.assertEquals(
    state.hash(),
    'Initial state hash mismatch'
  );
  publicInput.spellCastHash.assertEquals(
    spellCast.hash(),
    'Spell cast hash mismatch'
  );
  modifyer(state, spellCast);
  return {
    publicOutput: new SpellsPublicOutput({
      finalStateHash: state.hash(),
    }),
  };
}

export class LightningBoldSpellCast
  extends Struct({
    caster: Field,
    spellId: Field,
    target: Field,
    additionalData: LightningBoldData,
  })
  implements SpellCast<LightningBoldData>
{
  hash(): Field {
    return Poseidon.hash([
      this.caster,
      this.spellId,
      this.target,
      this.additionalData.position.hash(),
    ]);
  }
}

export const LightningBoldProgram = ZkProgram({
  name: 'LightningBold',
  publicInput: SpellsPublicInput,
  publicOutput: SpellsPublicOutput,
  methods: {
    prove: {
      privateInputs: [State, LightningBoldSpellCast],
      async method(
        publicInput: SpellsPublicInput,
        state: State,
        spellCast: LightningBoldSpellCast
      ) {
        return verifySpellCastTransition(
          publicInput,
          state,
          spellCast,
          LightningBoldModifyer
        );
      },
    },
  },
});

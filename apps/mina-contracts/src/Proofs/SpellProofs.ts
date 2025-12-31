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
  modifier: (state: State, spellCast: SpellCast<T>) => void
) {
  publicInput.initialStateHash.assertEquals(
    state.hash(),
    'Initial state hash mismatch'
  );
  publicInput.spellCastHash.assertEquals(
    spellCast.hash(),
    'Spell cast hash mismatch'
  );
  modifier(state, spellCast);
  return {
    publicOutput: new SpellsPublicOutput({
      finalStateHash: state.hash(),
    }),
  };
}

export const splellsProofs = allSpells.map((spell) => {
  return ZkProgram({
    name: spell.name,
    publicInput: SpellsPublicInput,
    publicOutput: SpellsPublicOutput,
    methods: {
      prove: {
        privateInputs: [State, spell.spellCast],
        async method(
          publicInput: SpellsPublicInput,
          state: State,
          spellCast: typeof spell.spellCast
        ) {
          return verifySpellCastTransition(
            publicInput,
            state,
            spellCast,
            spell.modifier
          );
        },
      },
    },
  });
});

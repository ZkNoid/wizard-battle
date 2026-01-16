// Create proof for each spell
import { SpellsPublicInput, SpellsPublicOutput } from './DynamicProof';
import { State } from '@wizard-battle/common/stater/state';
import { allSpells } from '@wizard-battle/common/stater/spells';
import { SpellCast } from '@wizard-battle/common/stater/structs';
import { Field, Poseidon, Struct, ZkProgram } from 'o1js';
import { Stater } from '@wizard-battle/common';

export function verifySpellCastTransition<T>(
  publicInput: SpellsPublicInput,
  stater: Stater,
  opponentState: State,
  spellCast: SpellCast<T>,
  modifier: (
    stater: Stater,
    spellCast: SpellCast<T>,
    opponentState: State
  ) => void
) {
  publicInput.initialStateHash.assertEquals(
    stater.state.hash(),
    'Initial state hash mismatch'
  );
  publicInput.spellCastHash.assertEquals(
    spellCast.hash(),
    'Spell cast hash mismatch'
  );
  modifier(stater, spellCast, opponentState);
  return {
    publicOutput: new SpellsPublicOutput({
      finalStateHash: stater.state.hash(),
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
        privateInputs: [Stater, State, spell.spellCast],
        async method(
          publicInput: SpellsPublicInput,
          stater: Stater,
          spellCast: typeof spell.spellCast,
          opponentState: State
        ) {
          return verifySpellCastTransition(
            publicInput,
            stater,
            opponentState,
            spellCast,
            spell.modifier
          );
        },
      },
    },
  });
});

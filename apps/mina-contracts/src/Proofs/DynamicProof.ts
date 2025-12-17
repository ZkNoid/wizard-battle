import { DynamicProof, FeatureFlags, Field, Struct } from 'o1js';

export class SpellsPublicInput extends Struct({
  initialStateHash: Field,
  spellCastHash: Field,
}) {}

export class SpellsPublicOutput extends Struct({
  finalStateHash: Field,
}) {}

export class SpellsDynamicProof extends DynamicProof<
  SpellsPublicInput,
  SpellsPublicOutput
> {
  static publicInputType = SpellsPublicInput;
  static publicOutputType = SpellsPublicOutput;
  static maxProofsVerified = 0 as const;
  static featureFlags = FeatureFlags.allMaybe;
}

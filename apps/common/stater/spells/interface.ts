import { Field } from 'o1js';
import { WizardId } from '../../wizards';
import { type SpellCast, SpellStats } from '../structs';
import type { State } from '../state';

export interface ISpell<T> {
  id: Field;
  wizardId: Field;
  cooldown: Field;
  name: string;
  description: string;
  image: string;
  modifyer: (state: State, spellCast: SpellCast<T>) => void;
  cast: (state: State, additionalData: any) => SpellCast<T>;
  defaultValue: SpellStats;
}

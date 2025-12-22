import { Field, Struct } from 'o1js';
import { WizardId } from '../../wizards';
import { type SpellCast, SpellStats } from '../structs';
import type { State } from '../state';
import { Stater } from '../stater';

export interface ISpell<T> {
  id: Field;
  wizardId: Field;
  cooldown: Field;
  name: string;
  description: string;
  image: string;
  modifyerData: any;
  target: 'ally' | 'enemy';
  globalStatus?: 'global' | 'local';
  modifyer: (stater: Stater, spellCast: SpellCast<T>) => void;
  spellCast: T;
  cast: (
    state: State,
    caster: Field,
    target: Field,
    additionalData: any
  ) => SpellCast<T>;
  sceneEffect?: (
    x: number,
    y: number,
    gameEmitter: any,
    type: 'user' | 'enemy'
  ) => (() => void) | void;
  priority?: number;
  defaultValue: SpellStats;
}

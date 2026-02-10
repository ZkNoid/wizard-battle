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
  modifierData: any;
  target: 'ally' | 'enemy';
  globalStatus?: 'global' | 'local';
  modifier: (
    stater: Stater,
    spellCast: SpellCast<T>,
    opponentState: State
  ) => void;
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
  /** Returns the positions affected by this spell centered at (x, y) */
  affectedArea?: (x: number, y: number) => { x: number; y: number }[];
  priority?: number;
  defaultValue: SpellStats;
  /** Companion spell ID that is cast on self alongside the main spell */
  companionSpellId?: Field;
  /** If true, spell is not shown in UI spell selection (used for internal companion spells) */
  hidden?: boolean;
  /** Returns valid positions where this spell can be cast from the caster's position (x, y) */
  castedArea?: (x: number, y: number) => { x: number; y: number }[];
}

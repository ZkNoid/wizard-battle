import { Field } from 'o1js';
import { WizardId } from '../../wizards';
import { type SpellCast, SpellStats } from '../structs';
import type { State } from '../state';
import { GameEventEmitter } from '../../../frontend/src/engine/gameEventEmitter';

export interface ISpell<T> {
  id: Field;
  wizardId: Field;
  cooldown: Field;
  name: string;
  description: string;
  image: string;
  modifyerData: any;
  target: 'ally' | 'enemy';
  modifyer: (state: State, spellCast: SpellCast<T>) => void;
  cast: (state: State, target: Field, additionalData: any) => SpellCast<T>;
  sceneEffect?: (
    x: number,
    y: number,
    gameEmitter: GameEventEmitter,
    type: 'user' | 'enemy'
  ) => void;
  defaultValue: SpellStats;
}

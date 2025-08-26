import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { allSpells } from '../../../common/stater/spells';
import { Field } from 'o1js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function spellIdToSpell(spellId: Field) {
  return allSpells.find((spell) => spell.id.toString() === spellId.toString());
}

import { mageSpells } from './spells/mage';
import { allCommonSpells } from './spells/common';
import { Field } from 'o1js';

export const allSpells = [...mageSpells, ...allCommonSpells];

const SpellId: Record<string, Field> = {};

allSpells.forEach((spell) => {
  SpellId[spell.name] = spell.id;
});

export { SpellId };

import { mageSpells } from './spells/mage';
import { allCommonSpells } from './spells/common';
import { archerSpells } from './spells/archer';
import { Field } from 'o1js';

export const allSpells = [...mageSpells, ...archerSpells, ...allCommonSpells];

const SpellId: Record<string, Field> = {};

allSpells.forEach((spell) => {
  SpellId[spell.name] = spell.id;
});

export { SpellId };

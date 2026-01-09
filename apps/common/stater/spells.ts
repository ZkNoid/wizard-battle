import { mageSpells } from './spells/mage';
import { allCommonSpells } from './spells/common';
import { archerSpells } from './spells/archer';
import { phantomDuelistSpells } from './spells/phantom_duelist';
import { Field } from 'o1js';

export const allSpells = [...mageSpells, ...archerSpells, ...phantomDuelistSpells, ...allCommonSpells];

const SpellId: Record<string, Field> = {};

allSpells.forEach((spell) => {
  SpellId[spell.name] = spell.id;
});

export { SpellId };

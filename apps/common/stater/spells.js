"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellId = exports.allSpells = void 0;
const mage_1 = require("./spells/mage");
const common_1 = require("./spells/common");
const archer_1 = require("./spells/archer");
const phantom_duelist_1 = require("./spells/phantom_duelist");
exports.allSpells = [...mage_1.mageSpells, ...archer_1.archerSpells, ...phantom_duelist_1.phantomDuelistSpells, ...common_1.allCommonSpells];
const SpellId = {};
exports.SpellId = SpellId;
exports.allSpells.forEach((spell) => {
    SpellId[spell.name] = spell.id;
});

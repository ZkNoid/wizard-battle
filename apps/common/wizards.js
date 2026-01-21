"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allWizards = exports.WizardId = void 0;
const o1js_1 = require("o1js");
const state_1 = require("./stater/state");
const structs_1 = require("./stater/structs");
const effects_1 = require("./stater/effects/effects");
exports.WizardId = {
    MAGE: o1js_1.CircuitString.fromString('Mage').hash(),
    ARCHER: o1js_1.CircuitString.fromString('Archer').hash(),
    PHANTOM_DUELIST: o1js_1.CircuitString.fromString('PhantomDuelist').hash(),
    COMMON: o1js_1.CircuitString.fromString('Common').hash(),
};
const mageDefaultState = () => {
    let state = state_1.State.default();
    state.wizardId = exports.WizardId.MAGE;
    state.pushEffect(new structs_1.Effect({
        effectId: effects_1.EffectsId.Invisible,
        duration: (0, o1js_1.Field)(-1),
        param: (0, o1js_1.Field)(0),
    }), 'public', (0, o1js_1.Bool)(true));
    return state;
};
const archerDefaultState = () => {
    let state = state_1.State.default();
    state.wizardId = exports.WizardId.ARCHER;
    state.playerStats.speed = o1js_1.Int64.from(3);
    return state;
};
const phantomDuelistDefaultState = () => {
    let state = state_1.State.default();
    state.wizardId = exports.WizardId.PHANTOM_DUELIST;
    // Phantom Armor passive: +50% Defence
    // Base defense is 100, so 150 = 100 * 1.5
    state.playerStats.defense = state.playerStats.defense.mul(150).div(100);
    return state;
};
exports.allWizards = [
    {
        id: exports.WizardId.MAGE,
        name: 'Wizard',
        defaultHealth: 100,
        publicFields: ['map', 'health'],
        imageURL: '/wizards/base-wizard.svg',
        defaultState: mageDefaultState,
    },
    {
        id: exports.WizardId.ARCHER,
        name: 'Archer',
        defaultHealth: 100,
        publicFields: ['map', 'health'],
        imageURL: '/wizards/archer.svg',
        defaultState: archerDefaultState,
    },
    {
        id: exports.WizardId.PHANTOM_DUELIST,
        name: 'Phantom Duelist',
        defaultHealth: 100,
        publicFields: ['map', 'health'],
        imageURL: '/wizards/phantom_duelist.png',
        defaultState: phantomDuelistDefaultState,
    },
    // {
    //   id: WizardId.WARRIOR,
    //   name: 'Warrior',
    //   defaultHealth: 300,
    //   publicFields: ['playerPosition', 'map', 'health'],
    //   requiredLevel: 2,
    //   imageURL: '/wizards/base-wizard.svg',
    // },
];

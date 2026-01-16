import { Bool, CircuitString, Field, Int64 } from 'o1js';
import { State } from './stater/state';
import { Effect } from './stater/structs';
import { EffectsId } from './stater/effects/effects';

export interface Wizard {
  id: Field;
  name: string;
  defaultHealth: number;
  publicFields?: string[];
  requiredLevel?: number;
  imageURL?: string;
  defaultState: () => State;
}

export const WizardId = {
  MAGE: CircuitString.fromString('Mage').hash(),
  ARCHER: CircuitString.fromString('Archer').hash(),
  PHANTOM_DUELIST: CircuitString.fromString('PhantomDuelist').hash(),
  COMMON: CircuitString.fromString('Common').hash(),
};

const mageDefaultState = () => {
  let state = State.default();
  state.wizardId = WizardId.MAGE;

  state.pushEffect(
    new Effect({
      effectId: EffectsId.Invisible!,
      duration: Field(-1),
      param: Field(0),
    }),
    'public',
    Bool(true)
  );

  return state;
};

const archerDefaultState = () => {
  let state = State.default();
  state.wizardId = WizardId.ARCHER;
  state.playerStats.speed = Int64.from(3);

  return state;
};

const phantomDuelistDefaultState = () => {
  let state = State.default();
  state.wizardId = WizardId.PHANTOM_DUELIST;

  // Phantom Armor passive: +50% Defence
  // Base defense is 100, so 150 = 100 * 1.5
  state.playerStats.defense = state.playerStats.defense.mul(150).div(100);

  return state;
};

export const allWizards: Wizard[] = [
  {
    id: WizardId.MAGE,
    name: 'Wizard',
    defaultHealth: 100,
    publicFields: ['map', 'health'],
    imageURL: '/wizards/base-wizard.svg',
    defaultState: mageDefaultState,
  },
  {
    id: WizardId.ARCHER,
    name: 'Archer',
    defaultHealth: 100,
    publicFields: ['map', 'health'],
    imageURL: '/wizards/archer.svg',
    defaultState: archerDefaultState,
  },
  {
    id: WizardId.PHANTOM_DUELIST,
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

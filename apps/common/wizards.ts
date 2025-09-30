import { CircuitString, Field, Int64 } from 'o1js';
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
  COMMON: CircuitString.fromString('Common').hash(),
};

const mageDefaultState = () => {
  let state = State.default();
  state.wizardId = WizardId.MAGE;

  state.pushEffect(
    new Effect({
      effectId: EffectsId.Invisible!,
      duration: Field(-1),
    }),
    'public'
  );

  return state;
};

const archerDefaultState = () => {
  let state = State.default();
  state.wizardId = WizardId.ARCHER;

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
    imageURL: '/wizards/archer.jpg',
    defaultState: archerDefaultState,
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

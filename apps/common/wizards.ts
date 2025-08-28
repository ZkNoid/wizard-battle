import { CircuitString, Field } from 'o1js';

export interface Wizard {
  id: Field;
  name: string;
  defaultHealth: number;
  publicFields?: string[];
  requiredLevel?: number;
  imageURL?: string;
}

export const WizardId = {
  MAGE: CircuitString.fromString('Mage').hash(),
  WARRIOR: CircuitString.fromString('Warrior').hash(),
  ROGUE: CircuitString.fromString('Rogue').hash(),
  COMMON: CircuitString.fromString('Common').hash(),
};

export const allWizards: Wizard[] = [
  {
    id: WizardId.MAGE,
    name: 'Wizard',
    defaultHealth: 100,
    publicFields: ['map', 'health'],
    imageURL: '/wizards/base-wizard.svg',
  },
  {
    id: WizardId.WARRIOR,
    name: 'Warrior',
    defaultHealth: 300,
    publicFields: ['playerPosition', 'map', 'health'],
    requiredLevel: 2,
    imageURL: '/wizards/base-wizard.svg',
  },
];

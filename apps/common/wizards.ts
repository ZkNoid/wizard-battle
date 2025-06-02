export interface Wizard {
  id: string;
  name: string;
  defaultHealth: number;
  publicFields?: string[];
  requiredLevel?: number;
  imageURL?: string;
}

export enum WizardId {
  MAGE = "Mage",
  WARRIOR = "Warrior",
  ROGUE = "Rogue",
}

export const allWizards: Wizard[] = [
  {
    id: WizardId.MAGE,
    name: "Wizard",
    defaultHealth: 100,
    publicFields: ["map", "health"],
    imageURL: "/wizards/base-wizard.svg",
  },
  {
    id: WizardId.WARRIOR,
    name: "Warrior",
    defaultHealth: 300,
    publicFields: ["playerPosition", "map", "health"],
    requiredLevel: 2,
    imageURL: "/wizards/base-wizard.svg",
  },
];

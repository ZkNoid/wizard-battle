import type { IWizard } from "../types/IWizard";

export const wizards: IWizard[] = [
  {
    id: "1",
    imageURL: "/wizards/base-wizard.svg",
    skills: [
      {
        id: "1",
        description: "Fireball",
        imageURL: "/wizards/skills/1.svg",
      },
      {
        id: "2",
        description: "Frostbolt",
        imageURL: "/wizards/skills/2.svg",
      },
      {
        id: "3",
        description: "Arcane Blast",
        imageURL: "/wizards/skills/3.svg",
      },
      {
        id: "4",
        description: "Arcane Explosion",
        imageURL: "/wizards/skills/4.svg",
      },
      {
        id: "5",
        description: "Arcane Blast",
        imageURL: "/wizards/skills/5.svg",
      },
    ],
  },
  {
    id: "2",
    imageURL: "/wizards/base-wizard.svg",
    skills: [
      {
        id: "1",
        description: "Fireball",
        imageURL: "/wizards/skills/1.svg",
      },
      {
        id: "2",
        description: "Frostbolt",
        imageURL: "/wizards/skills/2.svg",
      },
    ],
  },
];

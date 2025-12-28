import type { ICraftGroupPanel } from '../types/Creaft';

export const CRAFT_GROUP_PANELS: ICraftGroupPanel[] = [
  {
    title: 'Neclace',
    icon: '/inventory/placeholders/necklace.png',
    items: [
      {
        id: 'Sorcerer_necklace',
        image: '/inventory/craft/sorcerer_necklace.png',
        title: 'Sorcerer necklace',
        description: 'Some description',
        recipe: [],
      },
    ],
  },
  {
    title: 'Rings',
    icon: '/inventory/placeholders/ring.png',
    items: [],
  },
  {
    title: 'Belts',
    icon: '/inventory/placeholders/belt.png',
    items: [],
  },
  {
    title: 'Gloves',
    icon: '/inventory/placeholders/arms.png',
    items: [],
  },
  {
    title: 'Boots',
    icon: '/inventory/placeholders/legs.png',
    items: [],
  },
];

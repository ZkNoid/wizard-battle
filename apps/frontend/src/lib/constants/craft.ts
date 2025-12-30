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
        recipe: [
          {
            id: 'Amber',
            image: 'Amber.png',
            title: 'Amber',
            description: 'Some description',
            amount: 1,
            price: 100,
            rarity: 'common',
            type: 'craft',
            requiredAmount: 1,
          },
          {
            id: 'ChainLink',
            image: 'ChainLink.png',
            title: 'Chain Link',
            type: 'craft',
            amount: 1,
            price: 100,
            description: 'Some description',
            rarity: 'common',
            requiredAmount: 3,
          },
          {
            id: 'Pearl',
            image: 'Pearl.png',
            title: 'Pearl',
            type: 'craft',
            amount: 1,
            price: 100,
            description: 'Some description',
            rarity: 'common',
            requiredAmount: 2,
          },
        ],
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

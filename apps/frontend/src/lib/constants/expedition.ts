import type { IExpedition } from '../types/Expedition';
import type { ILocation } from '../types/Location';
import { allWizards } from '../../../../common/wizards';
import { ALL_ITEMS } from './items';

export const LOCATIONS: ILocation[] = [
  {
    id: 1,
    name: 'River',
    image: '/locations/river.png',
  },
  {
    id: 2,
    name: 'Mountain',
    image: '/locations/mountain.png',
  },
  {
    id: 3,
    name: 'Forest',
    image: '/locations/forest.png',
  },
  {
    id: 4,
    name: 'Hills',
    image: '/locations/hills.png',
  },
];

const getRandomAmount = () => Math.floor(Math.random() * 10) + 1;

export const CURRENT_EXPEDITIONS: IExpedition[] = [
  {
    id: 'exp-1',
    characterId: allWizards[0]!.id,
    characterRole: allWizards[0]!.name,
    characterImage: allWizards[0]!.imageURL || '',
    locationId: LOCATIONS[0]!.id,
    locationName: LOCATIONS[0]!.name,
    rewards: [
      {
        id: ALL_ITEMS[0]!.id,
        name: ALL_ITEMS[0]!.title,
        image: ALL_ITEMS[0]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[1]!.id,
        name: ALL_ITEMS[1]!.title,
        image: ALL_ITEMS[1]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[2]!.id,
        name: ALL_ITEMS[2]!.title,
        image: ALL_ITEMS[2]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[3]!.id,
        name: ALL_ITEMS[3]!.title,
        image: ALL_ITEMS[3]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[4]!.id,
        name: ALL_ITEMS[4]!.title,
        image: ALL_ITEMS[4]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 3600000, // 1 hour
  },
  {
    id: 'exp-2',
    characterId: allWizards[1]!.id,
    characterRole: allWizards[1]!.name,
    characterImage: allWizards[1]!.imageURL || '',
    locationId: LOCATIONS[1]!.id,
    locationName: LOCATIONS[1]!.name,
    rewards: [
      {
        id: ALL_ITEMS[5]!.id,
        name: ALL_ITEMS[5]!.title,
        image: ALL_ITEMS[5]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[6]!.id,
        name: ALL_ITEMS[6]!.title,
        image: ALL_ITEMS[6]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[7]!.id,
        name: ALL_ITEMS[7]!.title,
        image: ALL_ITEMS[7]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[8]!.id,
        name: ALL_ITEMS[8]!.title,
        image: ALL_ITEMS[8]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[9]!.id,
        name: ALL_ITEMS[9]!.title,
        image: ALL_ITEMS[9]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 7200000, // 2 hours
  },
  {
    id: 'exp-3',
    characterId: allWizards[2]!.id,
    characterRole: allWizards[2]!.name,
    characterImage: allWizards[2]!.imageURL || '',
    locationId: LOCATIONS[2]!.id,
    locationName: LOCATIONS[2]!.name,
    rewards: [
      {
        id: ALL_ITEMS[10]!.id,
        name: ALL_ITEMS[10]!.title,
        image: ALL_ITEMS[10]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[11]!.id,
        name: ALL_ITEMS[11]!.title,
        image: ALL_ITEMS[11]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[12]!.id,
        name: ALL_ITEMS[12]!.title,
        image: ALL_ITEMS[12]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[13]!.id,
        name: ALL_ITEMS[13]!.title,
        image: ALL_ITEMS[13]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[14]!.id,
        name: ALL_ITEMS[14]!.title,
        image: ALL_ITEMS[14]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 5400000, // 1.5 hours
  },
  {
    id: 'exp-4',
    characterId: allWizards[0]!.id,
    characterRole: allWizards[0]!.name,
    characterImage: allWizards[0]!.imageURL || '',
    locationId: LOCATIONS[3]!.id,
    locationName: LOCATIONS[3]!.name,
    rewards: [
      {
        id: ALL_ITEMS[15]!.id,
        name: ALL_ITEMS[15]!.title,
        image: ALL_ITEMS[15]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[16]!.id,
        name: ALL_ITEMS[16]!.title,
        image: ALL_ITEMS[16]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[17]!.id,
        name: ALL_ITEMS[17]!.title,
        image: ALL_ITEMS[17]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[18]!.id,
        name: ALL_ITEMS[18]!.title,
        image: ALL_ITEMS[18]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[19]!.id,
        name: ALL_ITEMS[19]!.title,
        image: ALL_ITEMS[19]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 10800000, // 3 hours
  },
  {
    id: 'exp-5',
    characterId: allWizards[1]!.id,
    characterRole: allWizards[1]!.name,
    characterImage: allWizards[1]!.imageURL || '',
    locationId: LOCATIONS[0]!.id,
    locationName: LOCATIONS[0]!.name,
    rewards: [
      {
        id: ALL_ITEMS[20]!.id,
        name: ALL_ITEMS[20]!.title,
        image: ALL_ITEMS[20]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[21]!.id,
        name: ALL_ITEMS[21]!.title,
        image: ALL_ITEMS[21]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[22]!.id,
        name: ALL_ITEMS[22]!.title,
        image: ALL_ITEMS[22]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[23]!.id,
        name: ALL_ITEMS[23]!.title,
        image: ALL_ITEMS[23]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[24]!.id,
        name: ALL_ITEMS[24]!.title,
        image: ALL_ITEMS[24]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 1800000, // 30 minutes
  },
  {
    id: 'exp-6',
    characterId: allWizards[2]!.id,
    characterRole: allWizards[2]!.name,
    characterImage: allWizards[2]!.imageURL || '',
    locationId: LOCATIONS[1]!.id,
    locationName: LOCATIONS[1]!.name,
    rewards: [
      {
        id: ALL_ITEMS[0]!.id,
        name: ALL_ITEMS[0]!.title,
        image: ALL_ITEMS[0]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[5]!.id,
        name: ALL_ITEMS[5]!.title,
        image: ALL_ITEMS[5]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[10]!.id,
        name: ALL_ITEMS[10]!.title,
        image: ALL_ITEMS[10]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[15]!.id,
        name: ALL_ITEMS[15]!.title,
        image: ALL_ITEMS[15]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[20]!.id,
        name: ALL_ITEMS[20]!.title,
        image: ALL_ITEMS[20]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 14400000, // 4 hours
  },
  {
    id: 'exp-7',
    characterId: allWizards[0]!.id,
    characterRole: allWizards[0]!.name,
    characterImage: allWizards[0]!.imageURL || '',
    locationId: LOCATIONS[2]!.id,
    locationName: LOCATIONS[2]!.name,
    rewards: [
      {
        id: ALL_ITEMS[3]!.id,
        name: ALL_ITEMS[3]!.title,
        image: ALL_ITEMS[3]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[8]!.id,
        name: ALL_ITEMS[8]!.title,
        image: ALL_ITEMS[8]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[13]!.id,
        name: ALL_ITEMS[13]!.title,
        image: ALL_ITEMS[13]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[18]!.id,
        name: ALL_ITEMS[18]!.title,
        image: ALL_ITEMS[18]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[23]!.id,
        name: ALL_ITEMS[23]!.title,
        image: ALL_ITEMS[23]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 9000000, // 2.5 hours
  },
  {
    id: 'exp-8',
    characterId: allWizards[1]!.id,
    characterRole: allWizards[1]!.name,
    characterImage: allWizards[1]!.imageURL || '',
    locationId: LOCATIONS[3]!.id,
    locationName: LOCATIONS[3]!.name,
    rewards: [
      {
        id: ALL_ITEMS[2]!.id,
        name: ALL_ITEMS[2]!.title,
        image: ALL_ITEMS[2]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[7]!.id,
        name: ALL_ITEMS[7]!.title,
        image: ALL_ITEMS[7]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[12]!.id,
        name: ALL_ITEMS[12]!.title,
        image: ALL_ITEMS[12]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[17]!.id,
        name: ALL_ITEMS[17]!.title,
        image: ALL_ITEMS[17]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[22]!.id,
        name: ALL_ITEMS[22]!.title,
        image: ALL_ITEMS[22]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 6300000, // 1 hour 45 minutes
  },
  {
    id: 'exp-9',
    characterId: allWizards[2]!.id,
    characterRole: allWizards[2]!.name,
    characterImage: allWizards[2]!.imageURL || '',
    locationId: LOCATIONS[0]!.id,
    locationName: LOCATIONS[0]!.name,
    rewards: [
      {
        id: ALL_ITEMS[4]!.id,
        name: ALL_ITEMS[4]!.title,
        image: ALL_ITEMS[4]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[9]!.id,
        name: ALL_ITEMS[9]!.title,
        image: ALL_ITEMS[9]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[14]!.id,
        name: ALL_ITEMS[14]!.title,
        image: ALL_ITEMS[14]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[19]!.id,
        name: ALL_ITEMS[19]!.title,
        image: ALL_ITEMS[19]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[24]!.id,
        name: ALL_ITEMS[24]!.title,
        image: ALL_ITEMS[24]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 4500000, // 1 hour 15 minutes
  },
  {
    id: 'exp-10',
    characterId: allWizards[0]!.id,
    characterRole: allWizards[0]!.name,
    characterImage: allWizards[0]!.imageURL || '',
    locationId: LOCATIONS[1]!.id,
    locationName: LOCATIONS[1]!.name,
    rewards: [
      {
        id: ALL_ITEMS[1]!.id,
        name: ALL_ITEMS[1]!.title,
        image: ALL_ITEMS[1]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[6]!.id,
        name: ALL_ITEMS[6]!.title,
        image: ALL_ITEMS[6]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[11]!.id,
        name: ALL_ITEMS[11]!.title,
        image: ALL_ITEMS[11]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[16]!.id,
        name: ALL_ITEMS[16]!.title,
        image: ALL_ITEMS[16]!.image,
        amount: getRandomAmount(),
      },
      {
        id: ALL_ITEMS[21]!.id,
        name: ALL_ITEMS[21]!.title,
        image: ALL_ITEMS[21]!.image,
        amount: getRandomAmount(),
      },
    ],
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeToComplete: 12600000, // 3 hours 30 minutes
  },
];

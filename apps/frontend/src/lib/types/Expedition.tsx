import { Field } from 'o1js';

export type ExpeditionStatus = 'active' | 'completed' | 'pending';

export interface ICreateExpeditionData {
  location: number;
  character: number;
}

export interface IExpedition {
  id: string;
  characterId: Field;
  characterRole: string;
  characterImage: string;

  locationId: number;
  locationName: string;

  rewards: IExpeditionReward[];
  status: ExpeditionStatus;

  createdAt: Date;
  updatedAt: Date;
  timeToComplete: number;
}

export interface IExpeditionReward {
  id: string;
  name: string;
  image: string;
  amount: number;
}

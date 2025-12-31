import { Types } from 'mongoose';

export class LootItemDto {
  item!: {
    _id: Types.ObjectId;
    name: string;
    rarity: string;
    origin: string;
    desc: string;
  };
  quantity!: number;
}

export class LootResponseDto {
  loot!: LootItemDto[];
  totalItems!: number;
}
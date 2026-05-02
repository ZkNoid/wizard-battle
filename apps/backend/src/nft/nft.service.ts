import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryItem,
  InventoryItemDocument,
} from '../game-item/schemas/inventory-item.schema';

export interface Erc1155Attribute {
  trait_type: string;
  value: string | number;
}

export interface Erc1155Metadata {
  name: string;
  description: string;
  image: string;
  decimals: number;
  attributes: Erc1155Attribute[];
}

@Injectable()
export class NftService {
  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryItemModel: Model<InventoryItemDocument>
  ) {}

  async getMetadata(tokenId: string): Promise<Erc1155Metadata> {
    const item = await this.inventoryItemModel
      .findOne({ tokenId })
      .lean()
      .exec();

    if (!item) {
      throw new NotFoundException(`No metadata found for token ID ${tokenId}`);
    }

    const attributes: Erc1155Attribute[] = [
      { trait_type: 'Rarity', value: item.rarity },
      { trait_type: 'Type', value: item.type },
    ];

    if (item.wearableSlot) {
      attributes.push({ trait_type: 'Slot', value: item.wearableSlot });
    }

    if (item.level !== undefined) {
      attributes.push({ trait_type: 'Level', value: item.level });
    }

    if (item.buff) {
      for (const [stat, val] of Object.entries(item.buff)) {
        if (val !== undefined) {
          attributes.push({ trait_type: stat, value: String(val) });
        }
      }
    }

    return {
      name: item.title,
      description: item.description,
      image: item.image,
      decimals: 0,
      attributes,
    };
  }
}

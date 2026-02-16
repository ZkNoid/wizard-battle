import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryItem,
  InventoryItemDocument,
} from '../schemas/inventory-item.schema';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';

@Injectable()
export class iteminventoryervice {
  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryItemModel: Model<InventoryItemDocument>
  ) {}

  async create(createDto: CreateInventoryItemDto): Promise<InventoryItem> {
    const createdItem = new this.inventoryItemModel(createDto);
    return createdItem.save();
  }

  async createMany(createDtos: CreateInventoryItemDto[]) {
    return this.inventoryItemModel.insertMany(createDtos);
  }

  async findAll(): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find().exec();
  }

  async findOne(id: string): Promise<InventoryItem> {
    const item = await this.inventoryItemModel.findOne({ id }).exec();
    if (!item) {
      throw new NotFoundException(`InventoryItem with ID "${id}" not found`);
    }
    return item;
  }

  async findByMongoId(mongoId: string): Promise<InventoryItem> {
    const item = await this.inventoryItemModel.findById(mongoId).exec();
    if (!item) {
      throw new NotFoundException(
        `InventoryItem with MongoDB ID "${mongoId}" not found`
      );
    }
    return item;
  }

  async update(
    id: string,
    updateDto: UpdateInventoryItemDto
  ): Promise<InventoryItem> {
    const updatedItem = await this.inventoryItemModel
      .findOneAndUpdate({ id }, updateDto, { new: true })
      .exec();

    if (!updatedItem) {
      throw new NotFoundException(`InventoryItem with ID "${id}" not found`);
    }
    return updatedItem;
  }

  async delete(id: string): Promise<InventoryItem> {
    const deletedItem = await this.inventoryItemModel
      .findOneAndDelete({ id })
      .exec();
    if (!deletedItem) {
      throw new NotFoundException(`InventoryItem with ID "${id}" not found`);
    }
    return deletedItem;
  }

  // Filter by type
  async findByType(type: 'armor' | 'craft' | 'gems'): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find({ type }).exec();
  }

  async findCraftItems(): Promise<InventoryItem[]> {
    return this.findByType('craft');
  }

  async findArmorItems(): Promise<InventoryItem[]> {
    return this.inventoryItemModel
      .find({
        type: 'armor',
        wearableSlot: { $in: ['Gloves', 'Boots', 'Belt'] },
      })
      .exec();
  }

  async findAccessories(): Promise<InventoryItem[]> {
    return this.inventoryItemModel
      .find({
        type: 'armor',
        wearableSlot: { $in: ['Amulet', 'Orb', 'Ring'] },
      })
      .exec();
  }

  // Filter by slot
  async findBySlot(slot: string): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find({ wearableSlot: slot }).exec();
  }

  // Filter by rarity
  async findByRarity(rarity: string): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find({ rarity }).exec();
  }

  // Filter by level
  async findByMaxLevel(level: number): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find({ level: { $lte: level } }).exec();
  }

  // Get all armor and accessories combined
  async findAllArmorAndAccessories(): Promise<InventoryItem[]> {
    return this.inventoryItemModel.find({ type: 'armor' }).exec();
  }
}

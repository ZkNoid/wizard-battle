// src/game-items/services/drop.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameItemDrop, GameItemDropDocument } from '../schemas/game-item-drop.schema';
import { CreateDropDto } from '../dto/create-game-drop.dto';
import { UpdateDropDto } from '../dto/update-game-drop.dto';
import { BadRequestException } from '@nestjs/common';
import { LootRequestDto } from '../dto/loot-request.dto';
import { LootResponseDto } from '../dto/loot-response.dto';
import { LootItemDto } from '../dto/loot-response.dto';
import { GameItem, GameItemDocument } from '../schemas/game-item.schema';

@Injectable()
export class DropService {
  constructor(
    @InjectModel(GameItemDrop.name)
    private dropModel: Model<GameItemDropDocument>,
    @InjectModel(GameItem.name) private gameItemModel: Model<GameItemDocument>,
  ) {}

  async create(createDto: CreateDropDto): Promise<GameItemDrop> {
    const created = new this.dropModel(createDto);
    return created.save();
  }

  async findAll(): Promise<GameItemDrop[]> {
    return this.dropModel.find().populate('durations.dropGroups.item').exec();
  }

  async findOne(id: string): Promise<GameItemDrop> {
    const drop = await this.dropModel.findById(id).populate('durations.dropGroups.item').exec();
    if (!drop) {
      throw new NotFoundException(`Drop table with ID "${id}" not found`);
    }
    return drop;
  }

  async findByLocation(locationName: string): Promise<GameItemDrop> {
    const drop = await this.dropModel.findOne({ locationName }).populate('durations.dropGroups.item').exec();
    if (!drop) {
      throw new NotFoundException(`Drop table for location "${locationName}" not found`);
    }
    return drop;
  }

  async update(id: string, updateDto: UpdateDropDto): Promise<GameItemDrop> {
    const updated = await this.dropModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate('durations.dropGroups.item')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Drop table with ID "${id}" not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<GameItemDrop> {
    const deleted = await this.dropModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Drop table with ID "${id}" not found`);
    }
    return deleted;
  }

  async generateLoot(dto: LootRequestDto): Promise<LootResponseDto> {
    const { userId, locationName, durationHours } = dto;

    // Find the drop table for the location
    const dropTable = await this.dropModel
      .findOne({ locationName })
      .populate('durations.dropGroups.item')
      .exec();

    if (!dropTable) {
      throw new BadRequestException(`No drop table found for location: ${locationName}`);
    }

    // Find the duration config
    const durationConfig = dropTable.durations.find(
      (d) => d.durationHours === durationHours,
    );

    if (!durationConfig) {
      throw new BadRequestException(
        `No drop configuration for ${durationHours} hours in ${locationName}`,
      );
    }

    const lootMap = new Map<string, LootItemDto>();

    // Process each drop group
    for (const group of durationConfig.dropGroups) {
      if (group.type === 'guaranteed') {
        const itemId = group.item._id.toString();
        if (!lootMap.has(itemId)) {
          lootMap.set(itemId, {
            item: group.item as any,
            quantity: 0,
          });
        }
        lootMap.get(itemId)!.quantity += group.quantity;
      }

      else if (group.type === 'chance-rolls') {
        // We need to fetch items of the specified rarity
        // Assuming your GameItem has a 'rarity' field that matches (e.g., "unique", "common")
        const candidateItems = await this.gameItemModel
          .find({ rarity: group.rarity })
          .exec();

        if (candidateItems.length === 0) {
          continue; // no items of this rarity
        }

        // Perform the rolls
        for (let i = 0; i < group.rollsCount; i++) {
          const roll = Math.random() * 100;
          if (roll < group.chancePercent) {
            // Success! Drop a random item of this rarity
            const randomItem =
              candidateItems[Math.floor(Math.random() * candidateItems.length)];

            if (!randomItem) {
              continue;
            }

            const itemId = randomItem._id.toString();
            if (!lootMap.has(itemId)) {
              lootMap.set(itemId, {
                item: randomItem.toObject(),
                quantity: 0,
              });
            }
            lootMap.get(itemId)!.quantity += 1;
          }
        }
      }
    }

    const loot = Array.from(lootMap.values());

    return {
      loot,
      totalItems: loot.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}
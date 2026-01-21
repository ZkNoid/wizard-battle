import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameItem, GameItemDocument } from '../schemas/game-item.schema';
import { CreateGameItemDto } from '../dto/create-game-item.dto';
import { UpdateGameItemDto } from '../dto/update-game-item.dto';

@Injectable()
export class GameItemService {
  constructor(
    @InjectModel(GameItem.name)
    private readonly gameItemModel: Model<GameItemDocument>
  ) {}

  /*//////////////////////////////////////////////////////////////
                                ITEMS
  //////////////////////////////////////////////////////////////*/

  /** Create a new game item */
  async create(createDto: CreateGameItemDto): Promise<GameItem> {
    const createdItem = new this.gameItemModel(createDto);
    return createdItem.save();
  }

  /** Find all game items */
  async findAll(): Promise<GameItem[]> {
    return this.gameItemModel.find().exec();
  }

  /** Find one by ID */
  async findOne(id: string): Promise<GameItem> {
    const item = await this.gameItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`GameItem with ID "${id}" not found`);
    }
    return item;
  }

  /** Update a game item */
  async update(id: string, updateDto: UpdateGameItemDto): Promise<GameItem> {
    const updatedItem = await this.gameItemModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updatedItem) {
      throw new NotFoundException(`GameItem with ID "${id}" not found`);
    }
    return updatedItem;
  }

  /** Delete a game item */
  async delete(id: string): Promise<GameItem> {
    const deletedItem = await this.gameItemModel.findByIdAndDelete(id).exec();
    if (!deletedItem) {
      throw new NotFoundException(`GameItem with ID "${id}" not found`);
    }
    return deletedItem;
  }

  /** Find all craftable items (items that require recipes) */
  async findCraftableItems(): Promise<GameItem[]> {
    return this.gameItemModel.find({ isCraftable: true }).exec();
  }

  /** Find all standalone items/resources (items that don't require recipes) */
  async findStandaloneItems(): Promise<GameItem[]> {
    return this.gameItemModel.find({ isCraftable: false }).exec();
  }

  /** Find all basic resources */
  async findResources(): Promise<GameItem[]> {
    return this.gameItemModel.find({ isResource: true }).exec();
  }

  /** Find all items (non-resources) */
  async findItems(): Promise<GameItem[]> {
    return this.gameItemModel.find({ isResource: false }).exec();
  }
}

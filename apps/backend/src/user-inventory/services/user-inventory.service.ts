import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserInventory, UserInventoryDocument } from '../schemas/user-inventory.schema';
import { AddItemToInventoryDto } from '../dto/add-item-to-inventory.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';

@Injectable()
export class UserInventoryService {
  constructor(
    @InjectModel(UserInventory.name)
    private readonly inventoryModel: Model<UserInventoryDocument>,
  ) {}

  /**
   * Add an item to a user's inventory.
   * If the item already exists, increase the quantity.
   */
  async addItem(dto: AddItemToInventoryDto): Promise<UserInventory> {
    const existing = await this.inventoryModel.findOne({
      userId: dto.userId,
      itemId: dto.itemId,
    });

    if (existing) {
      // Update quantity if item already exists
      existing.quantity += dto.quantity || 1;
      return existing.save();
    }

    // Create new inventory entry
    const newItem = new this.inventoryModel({
      userId: dto.userId,
      itemId: dto.itemId,
      quantity: dto.quantity || 1,
      acquiredFrom: dto.acquiredFrom,
      acquiredAt: new Date(),
    });

    return newItem.save();
  }

  /**
   * Get all items in a user's inventory
   */
  async getUserInventory(userId: string): Promise<UserInventory[]> {
    return this.inventoryModel
      .find({ userId })
      .populate('itemId') // Populate full item details
      .exec();
  }

  /**
   * Get a specific item from a user's inventory
   */
  async getUserInventoryItem(userId: string, itemId: string): Promise<UserInventory> {
    const item = await this.inventoryModel
      .findOne({ userId, itemId })
      .populate('itemId')
      .exec();

    if (!item) {
      throw new NotFoundException(
        `Item ${itemId} not found in user ${userId}'s inventory`,
      );
    }

    return item;
  }

  /**
   * Remove an item (or reduce quantity) from user's inventory
   */
  async removeItem(
    userId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<UserInventory | null> {
    const item = await this.inventoryModel.findOne({ userId, itemId });

    if (!item) {
      throw new NotFoundException(
        `Item ${itemId} not found in user ${userId}'s inventory`,
      );
    }

    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    if (item.quantity < quantity) {
      throw new BadRequestException(
        `Cannot remove ${quantity} items. User only has ${item.quantity}`,
      );
    }

    if (item.quantity === quantity) {
      // Remove entirely if quantity becomes 0
      await item.deleteOne();
      return null;
    }

    // Reduce quantity
    item.quantity -= quantity;
    return item.save();
  }

  /**
   * Check if a user has a specific item with required quantity
   */
  async hasItem(
    userId: string,
    itemId: string,
    quantity: number = 1,
  ): Promise<boolean> {
    const item = await this.inventoryModel.findOne({ userId, itemId });
    return item ? item.quantity >= quantity : false;
  }

  /**
   * Check if user has multiple items with required quantities
   * Useful for crafting recipes
   */
  async hasItems(
    userId: string,
    requirements: Array<{ itemId: string; quantity: number }>,
  ): Promise<boolean> {
    for (const req of requirements) {
      const hasItem = await this.hasItem(userId, req.itemId, req.quantity);
      if (!hasItem) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update inventory item properties (e.g., isEquipped)
   */
  async updateInventoryItem(
    userId: string,
    itemId: string,
    updateDto: UpdateInventoryItemDto,
  ): Promise<UserInventory> {
    const item = await this.inventoryModel
      .findOneAndUpdate({ userId, itemId }, updateDto, { new: true })
      .populate('itemId')
      .exec();

    if (!item) {
      throw new NotFoundException(
        `Item ${itemId} not found in user ${userId}'s inventory`,
      );
    }

    return item;
  }

  /**
   * Get all equipped items for a user
   */
  async getEquippedItems(userId: string): Promise<UserInventory[]> {
    return this.inventoryModel
      .find({ userId, isEquipped: true })
      .populate('itemId')
      .exec();
  }

  /**
   * Clear all items from a user's inventory
   */
  async clearInventory(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.inventoryModel.deleteMany({ userId }).exec();
    return { deletedCount: result.deletedCount };
  }

  /**
   * Get inventory count for a user
   */
  async getInventoryCount(userId: string): Promise<number> {
    return this.inventoryModel.countDocuments({ userId }).exec();
  }
}

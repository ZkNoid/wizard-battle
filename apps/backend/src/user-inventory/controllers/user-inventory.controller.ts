import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UserInventoryService } from '../services/user-inventory.service';
import { AddItemToInventoryDto } from '../dto/add-item-to-inventory.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';
import { UserInventory } from '../schemas/user-inventory.schema';

@Controller('user-inventory')
export class UserInventoryController {
  constructor(private readonly inventoryService: UserInventoryService) {}

  /**
   * Add an item to user's inventory
   * POST /user-inventory/add
   */
  @Post('add')
  addItem(@Body() dto: AddItemToInventoryDto): Promise<UserInventory> {
    return this.inventoryService.addItem(dto);
  }

  /**
   * Get all items in a user's inventory
   * GET /user-inventory/:userId
   */
  @Get(':userId')
  getUserInventory(@Param('userId') userId: string): Promise<UserInventory[]> {
    return this.inventoryService.getUserInventory(userId);
  }

  /**
   * Get a specific item from user's inventory
   * GET /user-inventory/:userId/items/:itemId
   */
  @Get(':userId/items/:itemId')
  getUserInventoryItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
  ): Promise<UserInventory> {
    return this.inventoryService.getUserInventoryItem(userId, itemId);
  }

  /**
   * Get all equipped items for a user
   * GET /user-inventory/:userId/equipped
   */
  @Get(':userId/equipped')
  getEquippedItems(@Param('userId') userId: string): Promise<UserInventory[]> {
    return this.inventoryService.getEquippedItems(userId);
  }

  /**
   * Get inventory count for a user
   * GET /user-inventory/:userId/count
   */
  @Get(':userId/count')
  getInventoryCount(@Param('userId') userId: string): Promise<{ count: number }> {
    return this.inventoryService
      .getInventoryCount(userId)
      .then(count => ({ count }));
  }

  /**
   * Check if user has an item with required quantity
   * GET /user-inventory/:userId/has/:itemId?quantity=1
   */
  @Get(':userId/has/:itemId')
  hasItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number,
  ): Promise<{ hasItem: boolean }> {
    return this.inventoryService
      .hasItem(userId, itemId, quantity)
      .then(hasItem => ({ hasItem }));
  }

  /**
   * Update inventory item properties (e.g., equip/unequip)
   * PATCH /user-inventory/:userId/items/:itemId
   */
  @Patch(':userId/items/:itemId')
  updateInventoryItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInventoryItemDto,
  ): Promise<UserInventory> {
    return this.inventoryService.updateInventoryItem(userId, itemId, updateDto);
  }

  /**
   * Remove an item from inventory (or reduce quantity)
   * DELETE /user-inventory/:userId/items/:itemId?quantity=1
   */
  @Delete(':userId/items/:itemId')
  removeItem(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number,
  ): Promise<UserInventory | null> {
    return this.inventoryService.removeItem(userId, itemId, quantity);
  }

  /**
   * Clear entire inventory for a user
   * DELETE /user-inventory/:userId/clear
   */
  @Delete(':userId/clear')
  @HttpCode(HttpStatus.OK)
  clearInventory(
    @Param('userId') userId: string,
  ): Promise<{ deletedCount: number }> {
    return this.inventoryService.clearInventory(userId);
  }
}

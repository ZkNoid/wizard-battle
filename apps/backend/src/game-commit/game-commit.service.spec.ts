import { Test, TestingModule } from '@nestjs/testing';
import { GameCommitService } from './game-commit.service';
import { GameItemService } from '../game-item/services/game-item.service';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { NotFoundException } from '@nestjs/common';

describe('GameCommitService', () => {
  let service: GameCommitService;
  let gameItemService: jest.Mocked<GameItemService>;
  let userInventoryService: jest.Mocked<UserInventoryService>;

  // Mock data
  const mockGameItem = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Iron Ore',
    rarity: 'common',
    origin: 'mining',
    desc: 'A basic iron ore resource',
    isCraftable: false,
  };

  const mockGameItemCraftable = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Iron Sword',
    rarity: 'uncommon',
    origin: 'crafted',
    desc: 'A simple iron sword',
    isCraftable: true,
  };

  const mockInventoryItem = {
    userId: 'user123',
    itemId: '507f1f77bcf86cd799439011',
    quantity: 5,
    isEquipped: false,
    acquiredFrom: 'mining',
    acquiredAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    // Create mock services
    const mockGameItemServiceProvider = {
      provide: GameItemService,
      useValue: {
        findAll: jest.fn(),
      },
    };

    const mockUserInventoryServiceProvider = {
      provide: UserInventoryService,
      useValue: {
        hasItem: jest.fn(),
        getUserInventoryItem: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameCommitService,
        mockGameItemServiceProvider,
        mockUserInventoryServiceProvider,
      ],
    }).compile();

    service = module.get<GameCommitService>(GameCommitService);
    gameItemService = module.get(GameItemService);
    userInventoryService = module.get(UserInventoryService);

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('loadAndVerifyResourceForUserFromDataBase', () => {
    it('should return resource and verify user has it', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockInventoryItem as any
      );

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Iron Ore',
        'user123'
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource).toEqual({
        id: '507f1f77bcf86cd799439011',
        name: 'Iron Ore',
        rarity: 'common',
        origin: 'mining',
        description: 'A basic iron ore resource',
        isCraftable: false,
      });
      expect(result.inventoryDetails).toEqual({
        quantity: 5,
        isEquipped: false,
        acquiredFrom: 'mining',
        acquiredAt: new Date('2025-01-01'),
      });

      // Verify service calls
      expect(gameItemService.findAll).toHaveBeenCalledTimes(1);
      expect(userInventoryService.hasItem).toHaveBeenCalledWith(
        'user123',
        '507f1f77bcf86cd799439011'
      );
      expect(userInventoryService.getUserInventoryItem).toHaveBeenCalledWith(
        'user123',
        '507f1f77bcf86cd799439011'
      );

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith(
        '📦 Resource loaded from database:'
      );
      expect(console.log).toHaveBeenCalledWith('   Name: Iron Ore');
      expect(console.log).toHaveBeenCalledWith(
        '   User has "Iron Ore": ✅ YES'
      );
    });

    it('should return resource but user does not have it', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItem] as any);
      userInventoryService.hasItem.mockResolvedValue(false);

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Iron Ore',
        'user456'
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(false);
      expect(result.resource).toEqual({
        id: '507f1f77bcf86cd799439011',
        name: 'Iron Ore',
        rarity: 'common',
        origin: 'mining',
        description: 'A basic iron ore resource',
        isCraftable: false,
      });
      expect(result.inventoryDetails).toBeNull();

      // Verify service calls
      expect(gameItemService.findAll).toHaveBeenCalledTimes(1);
      expect(userInventoryService.hasItem).toHaveBeenCalledWith(
        'user456',
        '507f1f77bcf86cd799439011'
      );
      expect(userInventoryService.getUserInventoryItem).not.toHaveBeenCalled();

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith('   User has "Iron Ore": ❌ NO');
    });

    it('should handle resource not found in database', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItem] as any);

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Nonexistent Item',
        'user123'
      );

      // Assert
      expect(result.found).toBe(false);
      expect(result.userHasIt).toBe(false);
      expect(result.resource).toBeNull();
      expect(result.inventoryDetails).toBeNull();

      // Verify service calls
      expect(gameItemService.findAll).toHaveBeenCalledTimes(1);
      expect(userInventoryService.hasItem).not.toHaveBeenCalled();
      expect(userInventoryService.getUserInventoryItem).not.toHaveBeenCalled();

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith(
        '❌ Resource "Nonexistent Item" not found in database'
      );
    });

    it('should handle craftable items correctly', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItemCraftable] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue({
        ...mockInventoryItem,
        itemId: '507f1f77bcf86cd799439012',
        quantity: 1,
        isEquipped: true,
        acquiredFrom: 'crafted',
      } as any);

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Iron Sword',
        'user123'
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource?.isCraftable).toBe(true);
      expect(result.inventoryDetails?.quantity).toBe(1);
      expect(result.inventoryDetails?.isEquipped).toBe(true);

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith('   Is Craftable: true');
    });

    it('should handle inventory details fetch error gracefully', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockRejectedValue(
        new Error('Database connection error')
      );

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Iron Ore',
        'user123'
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource).toBeDefined();
      expect(result.inventoryDetails).toBeNull();

      // Verify warning was logged
      expect(console.log).toHaveBeenCalledWith(
        '   ⚠️ Could not fetch detailed inventory info: Database connection error'
      );
    });

    it('should handle multiple items in database', async () => {
      // Arrange
      const multipleItems = [
        mockGameItem,
        mockGameItemCraftable,
        {
          _id: '507f1f77bcf86cd799439013',
          name: 'Gold Ore',
          rarity: 'rare',
          origin: 'mining',
          desc: 'A rare gold ore',
          isCraftable: false,
        },
      ];
      gameItemService.findAll.mockResolvedValue(multipleItems as any);
      userInventoryService.hasItem.mockResolvedValue(false);

      // Act
      const result = await service.loadAndVerifyResourceForUserFromDataBase(
        'Gold Ore',
        'user123'
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.resource?.name).toBe('Gold Ore');
      expect(result.resource?.id).toBe('507f1f77bcf86cd799439013');
    });

    it('should throw error when gameItemService.findAll fails', async () => {
      // Arrange
      gameItemService.findAll.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.loadAndVerifyResourceForUserFromDataBase('Iron Ore', 'user123')
      ).rejects.toThrow('Database error');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error loading and verifying resource: Database error'
      );
    });

    it('should print all console logs for debugging', async () => {
      // Arrange
      gameItemService.findAll.mockResolvedValue([mockGameItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockInventoryItem as any
      );

      // Act
      await service.loadAndVerifyResourceForUserFromDataBase(
        'Iron Ore',
        'user123'
      );

      // Assert - verify all expected console logs were called
      expect(console.log).toHaveBeenCalledWith(
        '📦 Resource loaded from database:'
      );
      expect(console.log).toHaveBeenCalledWith('   Name: Iron Ore');
      expect(console.log).toHaveBeenCalledWith('   Rarity: common');
      expect(console.log).toHaveBeenCalledWith('   Origin: mining');
      expect(console.log).toHaveBeenCalledWith(
        '   Description: A basic iron ore resource'
      );
      expect(console.log).toHaveBeenCalledWith('   Is Craftable: false');
      expect(console.log).toHaveBeenCalledWith(
        '   Resource ID: 507f1f77bcf86cd799439011'
      );
      expect(console.log).toHaveBeenCalledWith(
        '\n🔍 Checking user inventory for userId: user123'
      );
      expect(console.log).toHaveBeenCalledWith(
        '   User has "Iron Ore": ✅ YES'
      );
      expect(console.log).toHaveBeenCalledWith('   Quantity: 5');
      expect(console.log).toHaveBeenCalledWith('   Is Equipped: false');
      expect(console.log).toHaveBeenCalledWith('   Acquired From: mining');
    });
  });

  describe('commitResource', () => {
    it('should commit a resource with mint action', async () => {
      const result = await service.commitResource('Iron Ore', 'mint', {
        amount: 10,
      });

      expect(result).toEqual({
        success: true,
        resource: 'Iron Ore',
        action: 'mint',
        payload: { amount: 10 },
      });
    });
  });

  describe('commitCoin', () => {
    it('should commit a coin with burn action', () => {
      const result = service.commitCoin('Gold', 'burn', { amount: 5 });

      expect(result).toEqual({
        success: true,
        coin: 'Gold',
        action: 'burn',
        payload: { amount: 5 },
      });
    });
  });

  // describe('commitItem', () => {
  //   it('should commit an item with modify action', () => {
  //     const result = service.commitItem('Sword', 'modify', { durability: 50 });

  //     expect(result).toEqual({
  //       success: true,
  //       item: 'Sword',
  //       action: 'modify',
  //       payload: { durability: 50 },
  //     });
  //   });
  // });

  describe('commitCharacter', () => {
    it('should commit a character with mint action', () => {
      const result = service.commitCharacter('Wizard', 'mint', { level: 1 });

      expect(result).toEqual({
        success: true,
        character: 'Wizard',
        action: 'mint',
        payload: { level: 1 },
      });
    });
  });
});

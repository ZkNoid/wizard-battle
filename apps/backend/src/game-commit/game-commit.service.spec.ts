import { Test, TestingModule } from '@nestjs/testing';
import { GameCommitService } from './game-commit.service';
import { GameItemService } from '../game-item/services/game-item.service';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { BlockchainService } from './blockchain.service';
import { NotFoundException } from '@nestjs/common';

describe('GameCommitService', () => {
  let service: GameCommitService;
  let gameItemService: jest.Mocked<GameItemService>;
  let userInventoryService: jest.Mocked<UserInventoryService>;
  let blockchainService: jest.Mocked<BlockchainService>;

  // Mock data - Resources
  const mockWoodResource = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Wood',
    rarity: 'common',
    origin: 'nature',
    desc: 'Basic crafting material harvested from trees. Used in various recipes and constructions.',
    isCraftable: false,
    isResource: true,
  };

  const mockGoldOreResource = {
    _id: '507f1f77bcf86cd799439013',
    name: 'Gold Ore',
    rarity: 'rare',
    origin: 'mining',
    desc: 'A rare gold ore',
    isCraftable: false,
    isResource: true,
  };

  // Mock data - Craftable items
  const mockWoodSwordItem = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Wood Sword',
    rarity: 'uncommon',
    origin: 'crafted',
    desc: 'A simple Wood sword',
    isCraftable: true,
    isResource: false,
  };

  // Mock data - Regular items
  const mockRegularItem = {
    _id: '507f1f77bcf86cd799439014',
    name: 'Health Potion',
    rarity: 'common',
    origin: 'drop',
    desc: 'Restores health',
    isCraftable: false,
    isResource: false,
  };

  const mockInventoryItem = {
    userId: 'user123',
    itemId: '507f1f77bcf86cd799439011',
    quantity: 5,
    isEquipped: false,
    acquiredFrom: 'mining',
    acquiredAt: new Date('2025-01-01'),
  };

  const mockWoodInventoryItem = {
    userId: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    itemId: '507f1f77bcf86cd799439011',
    quantity: 1000,
    isEquipped: false,
    acquiredFrom: 'admin-script',
    acquiredAt: new Date('2025-01-21'),
  };

  const mockGameElementMetadata = {
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenId: 1,
    requiresTokenId: true,
  };

  const mockCommitData = {
    resourceHash: '0xabcdef1234567890',
    commit: '0xdeadbeef',
    signature: '0x123456',
  };

  beforeEach(async () => {
    // Create mock services
    const mockGameItemServiceProvider = {
      provide: GameItemService,
      useValue: {
        findAll: jest.fn(),
        findResources: jest.fn(),
        findItems: jest.fn(),
        findCraftableItems: jest.fn(),
        findCraftedItems: jest.fn(),
      },
    };

    const mockUserInventoryServiceProvider = {
      provide: UserInventoryService,
      useValue: {
        hasItem: jest.fn(),
        getUserInventoryItem: jest.fn(),
      },
    };

    const mockBlockchainServiceProvider = {
      provide: BlockchainService,
      useValue: {
        getGameElement: jest.fn(),
        mintResource: jest.fn(),
        burnResource: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameCommitService,
        mockGameItemServiceProvider,
        mockUserInventoryServiceProvider,
        mockBlockchainServiceProvider,
      ],
    }).compile();

    service = module.get<GameCommitService>(GameCommitService);
    gameItemService = module.get(GameItemService);
    userInventoryService = module.get(UserInventoryService);
    blockchainService = module.get(BlockchainService);

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
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockInventoryItem as any
      );

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Wood',
        'user123',
        true,
        false
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource).toEqual({
        id: '507f1f77bcf86cd799439011',
        name: 'Wood',
        rarity: 'common',
        origin: 'nature',
        description:
          'Basic crafting material harvested from trees. Used in various recipes and constructions.',
        isCraftable: false,
        isResource: true,
      });
      expect(result.inventoryDetails).toEqual({
        quantity: 5,
        isEquipped: false,
        acquiredFrom: 'mining',
        acquiredAt: new Date('2025-01-01'),
      });

      // Verify service calls
      expect(gameItemService.findResources).toHaveBeenCalledTimes(1);
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
        '📦 Item/Resource loaded from database:'
      );
      expect(console.log).toHaveBeenCalledWith('   Name: Wood');
      expect(console.log).toHaveBeenCalledWith('   User has "Wood": ✅ YES');
    });

    it('should return resource but user does not have it', async () => {
      // Arrange
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(false);

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Wood',
        'user456',
        true,
        false
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(false);
      expect(result.resource).toEqual({
        id: '507f1f77bcf86cd799439011',
        name: 'Wood',
        rarity: 'common',
        origin: 'nature',
        description:
          'Basic crafting material harvested from trees. Used in various recipes and constructions.',
        isCraftable: false,
        isResource: true,
      });
      expect(result.inventoryDetails).toBeNull();

      // Verify service calls
      expect(gameItemService.findResources).toHaveBeenCalledTimes(1);
      expect(userInventoryService.hasItem).toHaveBeenCalledWith(
        'user456',
        '507f1f77bcf86cd799439011'
      );
      expect(userInventoryService.getUserInventoryItem).not.toHaveBeenCalled();

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith('   User has "Wood": ❌ NO');
    });

    it('should handle resource not found in database', async () => {
      // Arrange
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Nonexistent Item',
        'user123',
        true,
        false
      );

      // Assert
      expect(result.found).toBe(false);
      expect(result.userHasIt).toBe(false);
      expect(result.resource).toBeNull();
      expect(result.inventoryDetails).toBeNull();

      // Verify service calls
      expect(gameItemService.findResources).toHaveBeenCalledTimes(1);
      expect(userInventoryService.hasItem).not.toHaveBeenCalled();
      expect(userInventoryService.getUserInventoryItem).not.toHaveBeenCalled();

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith(
        '❌ Resource "Nonexistent Item" not found in database'
      );
    });

    it('should handle craftable items correctly', async () => {
      // Arrange
      gameItemService.findCraftableItems.mockResolvedValue([
        mockWoodSwordItem,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue({
        ...mockInventoryItem,
        itemId: '507f1f77bcf86cd799439012',
        quantity: 1,
        isEquipped: true,
        acquiredFrom: 'crafted',
      } as any);

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Wood Sword',
        'user123',
        false,
        true
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource?.isCraftable).toBe(true);
      expect(result.resource?.isResource).toBe(false);
      expect(result.inventoryDetails?.quantity).toBe(1);
      expect(result.inventoryDetails?.isEquipped).toBe(true);

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith('   Is Craftable: true');
      expect(console.log).toHaveBeenCalledWith('   Is Resource: false');
    });

    it('should handle inventory details fetch error gracefully', async () => {
      // Arrange
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockRejectedValue(
        new Error('Database connection error')
      );

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Wood',
        'user123',
        true,
        false
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
        mockWoodResource,
        mockWoodSwordItem,
        mockGoldOreResource,
      ];
      gameItemService.findResources.mockResolvedValue(multipleItems as any);
      userInventoryService.hasItem.mockResolvedValue(false);

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Gold Ore',
        'user123',
        true,
        false
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.resource?.name).toBe('Gold Ore');
      expect(result.resource?.id).toBe('507f1f77bcf86cd799439013');
      expect(result.resource?.isResource).toBe(true);
    });

    it('should throw error when gameItemService.findResources fails', async () => {
      // Arrange
      gameItemService.findResources.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        service.verifyUserHasItemResourceInDatabase(
          'Wood',
          'user123',
          true,
          false
        )
      ).rejects.toThrow('Database error');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Error loading and verifying resource: Database error'
      );
    });

    it('should print all console logs for debugging', async () => {
      // Arrange
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockInventoryItem as any
      );

      // Act
      await service.verifyUserHasItemResourceInDatabase(
        'Wood',
        'user123',
        true,
        false
      );

      // Assert - verify all expected console logs were called
      expect(console.log).toHaveBeenCalledWith(
        '📦 Item/Resource loaded from database:'
      );
      expect(console.log).toHaveBeenCalledWith('   Name: Wood');
      expect(console.log).toHaveBeenCalledWith('   Rarity: common');
      expect(console.log).toHaveBeenCalledWith('   Origin: nature');
      expect(console.log).toHaveBeenCalledWith(
        '   Description: Basic crafting material harvested from trees. Used in various recipes and constructions.'
      );
      expect(console.log).toHaveBeenCalledWith('   Is Craftable: false');
      expect(console.log).toHaveBeenCalledWith('   Is Resource: true');
      expect(console.log).toHaveBeenCalledWith(
        '   Resource ID: 507f1f77bcf86cd799439011'
      );
      expect(console.log).toHaveBeenCalledWith('\n🔍 Checking user inventory:');
      expect(console.log).toHaveBeenCalledWith('   User has "Wood": ✅ YES');
      expect(console.log).toHaveBeenCalledWith('   Quantity: 5');
      expect(console.log).toHaveBeenCalledWith('   Is Equipped: false');
      expect(console.log).toHaveBeenCalledWith('   Acquired From: mining');
    });

    // Test for regular items (non-craftable, non-resource)
    it('should handle regular items correctly', async () => {
      // Arrange
      gameItemService.findItems.mockResolvedValue([mockRegularItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue({
        ...mockInventoryItem,
        itemId: '507f1f77bcf86cd799439014',
        quantity: 3,
        isEquipped: false,
        acquiredFrom: 'drop',
      } as any);

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Health Potion',
        'user123',
        false,
        false
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource?.isCraftable).toBe(false);
      expect(result.resource?.isResource).toBe(false);
      expect(result.inventoryDetails?.quantity).toBe(3);

      // Verify service calls
      expect(gameItemService.findItems).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('   Is Craftable: false');
      expect(console.log).toHaveBeenCalledWith('   Is Resource: false');
    });

    // Test specifically for Wood resource with real-world scenario
    it('should verify Wood resource exists and user has 1000 quantity', async () => {
      // Arrange - simulating add-wood-to-inventory.js scenario
      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );

      // Act
      const result = await service.verifyUserHasItemResourceInDatabase(
        'Wood',
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        true,
        false
      );

      // Assert
      expect(result.found).toBe(true);
      expect(result.userHasIt).toBe(true);
      expect(result.resource?.name).toBe('Wood');
      expect(result.resource?.isResource).toBe(true);
      expect(result.inventoryDetails?.quantity).toBe(1000);
      expect(result.inventoryDetails?.acquiredFrom).toBe('admin-script');

      // Verify console logs
      expect(console.log).toHaveBeenCalledWith('   Quantity: 1000');
      expect(console.log).toHaveBeenCalledWith(
        '   Acquired From: admin-script'
      );
    });
  });

  describe('commitResource', () => {
    it('should commit a resource with mint action', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );
      blockchainService.mintResource.mockResolvedValue(mockCommitData);

      // Act
      const result = await service.commitResource('Wood', 'mint', payload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.resource).toBe('Wood');
      expect(result.action).toBe('mint');
      expect(result.commit).toEqual(mockCommitData);

      // Verify all service calls
      expect(gameItemService.findResources).toHaveBeenCalled();
      expect(userInventoryService.hasItem).toHaveBeenCalledWith(
        playerAddress,
        '507f1f77bcf86cd799439011'
      );
      expect(blockchainService.getGameElement).toHaveBeenCalledWith('Wood');
      expect(blockchainService.mintResource).toHaveBeenCalledWith(
        'Wood',
        playerAddress,
        1,
        1000
      );
    });

    it('should commit a resource with burn action', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 500 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );
      blockchainService.burnResource.mockResolvedValue(mockCommitData);

      // Act
      const result = await service.commitResource('Wood', 'burn', payload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.resource).toBe('Wood');
      expect(result.action).toBe('burn');
      expect(result.commit).toEqual(mockCommitData);

      // Verify burn was called
      expect(blockchainService.burnResource).toHaveBeenCalledWith(
        'Wood',
        playerAddress,
        1,
        1000
      );
    });

    it('should fail when resource not found in database', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(false);

      // Act
      const result = await service.commitResource('Wood', 'mint', payload);

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();

      // Verify blockchain services were not called
      expect(blockchainService.getGameElement).not.toHaveBeenCalled();
      expect(blockchainService.mintResource).not.toHaveBeenCalled();
    });

    it('should fail when user does not have the resource', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([]);

      // Act
      const result = await service.commitResource(
        'NonExistent',
        'mint',
        payload
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();
    });

    it('should fail when blockchain metadata is invalid', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );
      blockchainService.getGameElement.mockResolvedValue({
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenId: 0,
        requiresTokenId: false,
      });

      // Act
      const result = await service.commitResource('Wood', 'mint', payload);

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();

      // Verify mint was not called due to invalid metadata
      expect(blockchainService.mintResource).not.toHaveBeenCalled();
    });

    it('should fail when mintResource returns invalid data', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );
      blockchainService.mintResource.mockResolvedValue({
        resourceHash: '', // Empty hash indicates failure
        commit: '0x',
        signature: '0x',
      });

      // Act
      const result = await service.commitResource('Wood', 'mint', payload);

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();
    });

    it('should handle unsupported action', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1000 };

      gameItemService.findResources.mockResolvedValue([
        mockWoodResource,
      ] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue(
        mockWoodInventoryItem as any
      );
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );

      // Act
      const result = await service.commitResource(
        'Wood',
        'transfer' as any,
        payload
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();
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

  describe('commitItem', () => {
    it('should commit a regular item with mint action', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 5 };

      gameItemService.findItems.mockResolvedValue([mockRegularItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue({
        ...mockInventoryItem,
        itemId: '507f1f77bcf86cd799439014',
        quantity: 5,
      } as any);
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );
      blockchainService.mintResource.mockResolvedValue(mockCommitData);

      // Act
      const result = await service.commitItem('Health Potion', 'mint', payload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.resource).toBe('Health Potion');
      expect(result.action).toBe('mint');
      expect(result.commit).toEqual(mockCommitData);

      // Verify service calls
      expect(gameItemService.findItems).toHaveBeenCalled();
      expect(userInventoryService.hasItem).toHaveBeenCalled();
      expect(blockchainService.getGameElement).toHaveBeenCalledWith(
        'Health Potion'
      );
    });

    it('should commit a regular item with burn action', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 2 };

      gameItemService.findItems.mockResolvedValue([mockRegularItem] as any);
      userInventoryService.hasItem.mockResolvedValue(true);
      userInventoryService.getUserInventoryItem.mockResolvedValue({
        ...mockInventoryItem,
        itemId: '507f1f77bcf86cd799439014',
        quantity: 5,
      } as any);
      blockchainService.getGameElement.mockResolvedValue(
        mockGameElementMetadata
      );
      blockchainService.burnResource.mockResolvedValue(mockCommitData);

      // Act
      const result = await service.commitItem('Health Potion', 'burn', payload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.resource).toBe('Health Potion');
      expect(result.action).toBe('burn');

      // Verify burn was called
      expect(blockchainService.burnResource).toHaveBeenCalled();
    });

    it('should fail when item not found', async () => {
      // Arrange
      const playerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const payload = { playerAddress, amount: 1 };

      gameItemService.findItems.mockResolvedValue([]);

      // Act
      const result = await service.commitItem('NonExistent', 'mint', payload);

      // Assert
      expect(result.success).toBe(false);
      expect(result.commit).toBeNull();
    });
  });

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

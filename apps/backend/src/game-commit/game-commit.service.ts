import { Injectable } from '@nestjs/common';
import { GameItemService } from '../game-item/services/game-item.service';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { GameCharacterService } from '../game-character/game-character.service';
import { BlockchainService } from './blockchain.service';
import { GameItem } from '../game-item/schemas/game-item.schema';
import { iteminventoryervice } from '../game-item/services/inventory-item.service';
import { UserService } from '../user/user.service';
import { ethers } from 'ethers';

import { error } from 'console';

type GameElementStruct = {
  tokenAddress: string;
  tokenId: number;
  requiresTokenId: boolean;
};

@Injectable()
export class GameCommitService {
  constructor(
    private readonly gameItemService: GameItemService,
    private readonly userInventoryService: UserInventoryService,
    private readonly gameCharacterService: GameCharacterService,
    private readonly blockchainService: BlockchainService,
    private readonly inventoryItemService: iteminventoryervice,
    private readonly userService: UserService
  ) {}

  // Generic handler or specific logic per resource type

  async _queryCharacters(characterName: string, userId: string) {
    try {
      // 1. Find all characters for this user
      const userCharacters =
        await this.gameCharacterService.findAllByUserId(userId);

      // 2. Check if user has this specific character
      const character = userCharacters.find(
        (char) => char.name === characterName
      );

      if (!character) {
        console.log(
          `❌ Character "${characterName}" not found for user ${userId}`
        );
        return {
          found: false,
          userHasIt: false,
          character: null,
        };
      }

      // 3. Print character details
      console.log(`📦 Character loaded from database:`);
      console.log(`   Name: ${character.name}`);
      console.log(`   Level: ${character.level}`);
      console.log(`   User ID: ${character.userId}`);
      console.log(`   Character ID: ${(character as any)._id}`);

      return {
        found: true,
        userHasIt: true,
        character: {
          id: (character as any)._id.toString(),
          name: character.name,
          level: character.level,
          userId: character.userId,
        },
      };
    } catch (error: any) {
      console.error(
        `❌ Error loading and verifying character: ${error?.message || 'unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Helper function to load a resource from the database by name and userId.
   * Prints the resource parameters to console and verifies if the user has it.
   * @param itemName - The name of the game item/resource
   * @param userId - The user ID to check inventory for
   * @returns Object containing the resource, user has it status, and inventory details
   */
  async _queryInventory(
    itemName: string,
    userId: string,
    _isResource: boolean,
    _isCraftable: boolean
  ) {
    try {
      // 1. Find the resource by name in the GameItem collection
      let allItemsResource: GameItem[] = [];
      if (_isResource) {
        allItemsResource = await this.gameItemService.findResources();
      } else {
        if (!_isCraftable) {
          allItemsResource = await this.gameItemService.findItems();
        } else {
          allItemsResource = await this.gameItemService.findCraftableItems();
        }
      }
      const resource = allItemsResource.find((item) => item.name === itemName);

      if (!resource) {
        console.log(`❌ Resource "${itemName}" not found in database`);
        return {
          found: false,
          userHasIt: false,
          resource: null,
          inventoryItem: null,
          userInventory: null,
        };
      }

      // 2. Print resource params to console
      console.log(`📦 Item/Resource/Coins loaded from database:`);
      console.log(`   Name: ${resource.name}`);
      console.log(`   Rarity: ${resource.rarity}`);
      console.log(`   Origin: ${resource.origin}`);
      console.log(`   Description: ${resource.desc}`);
      console.log(`   Is Craftable: ${resource.isCraftable}`);
      console.log(`   Is Resource: ${resource.isResource}`);
      console.log(`   Resource ID: ${(resource as any)._id}`);

      const resourceId = (resource as any)._id.toString();

      // 3. Find the corresponding InventoryItem (match by title or name)
      let inventoryItem: any = null;
      try {
        inventoryItem = await this.inventoryItemService.findOne(itemName);
      } catch (error) {
        // InventoryItem might not exist, continue with only GameItem data
        console.log(`   ⚠️ InventoryItem not found for "${itemName}"`);
      }

      if (inventoryItem) {
        console.log(`\n📋 Inventory Item Details:`);
        console.log(`   Title: ${inventoryItem.title}`);
        console.log(`   Type: ${inventoryItem.type}`);
        console.log(`   Rarity: ${inventoryItem.rarity}`);
        console.log(`   Price: ${inventoryItem.price}`);
        console.log(`   Image: ${inventoryItem.image}`);
      }

      // 4. Check if user has this resource in their inventory
      console.log(`\n🔍 Checking user inventory:`);
      console.log(`   userId: ${userId}`);
      console.log(`   itemId: ${inventoryItem?.id || 'N/A'}`);

      const userHasIt = await this.userInventoryService.hasItem(
        userId,
        inventoryItem?.id || resourceId
      );

      console.log(
        `   User has "${itemName}": ${userHasIt ? '✅ YES' : '❌ NO'}`
      );

      // 5. Get detailed user inventory information if user has it
      let userInventory: any = null;
      if (userHasIt) {
        try {
          userInventory = await this.userInventoryService.getUserInventoryItem(
            userId,
            inventoryItem?.id || resourceId
          );
          console.log(`\n📦 User Inventory Details:`);
          console.log(`   Quantity: ${userInventory.quantity}`);
          console.log(`   Is Equipped: ${userInventory.isEquipped || false}`);
          if (userInventory.equippedToWizardId) {
            console.log(
              `   Equipped To Wizard: ${userInventory.equippedToWizardId}`
            );
          }
          console.log(
            `   Acquired From: ${userInventory.acquiredFrom || 'unknown'}`
          );
          console.log(
            `   Acquired At: ${userInventory.acquiredAt || 'unknown'}`
          );
        } catch (error: any) {
          console.log(
            `   ⚠️ Could not fetch user inventory details: ${error?.message || 'unknown error'}`
          );
        }
      }

      return {
        found: true,
        userHasIt,
        resource: {
          id: resourceId,
          name: resource.name,
          rarity: resource.rarity,
          origin: resource.origin,
          description: resource.desc,
          isCraftable: resource.isCraftable,
          isResource: resource.isResource,
        },
        inventoryItem: inventoryItem
          ? {
              id: inventoryItem.id,
              title: inventoryItem.title,
              description: inventoryItem.description,
              image: inventoryItem.image,
              type: inventoryItem.type,
              rarity: inventoryItem.rarity,
              price: inventoryItem.price,
              amount: inventoryItem.amount,
              wearableSlot: inventoryItem.wearableSlot,
              level: inventoryItem.level,
              buff: inventoryItem.buff,
              improvementRequirements: inventoryItem.improvementRequirements,
              wearRequirements: inventoryItem.wearRequirements,
            }
          : null,
        userInventory: userInventory
          ? {
              quantity: userInventory.quantity,
              isEquipped: userInventory.isEquipped,
              equippedToWizardId: userInventory.equippedToWizardId,
              acquiredFrom: userInventory.acquiredFrom,
              acquiredAt: userInventory.acquiredAt,
            }
          : null,
      };
    } catch (error: any) {
      console.error(
        `❌ Error loading and verifying resource: ${error?.message || 'unknown error'}`
      );
      throw error;
    }
  }

  async commitResource(name: string, action: 'mint' | 'burn', payload: any) {
    console.log(
      `\n========== COMMIT RESOURCE CALLED (v2 with fixes) ==========`
    );
    console.log(`Committing resource [${name}] - action: ${action}`, payload);
    try {
      // 1. We chek such resource exists and user has it in DB
      const result = await this._queryInventory(
        name,
        payload.playerAddress, // assuming playerAddress is used as userId here
        true,
        false
      );
      if (!result.found || !result.userHasIt) {
        throw new Error(`Resource ${name} not found or user does not have it.`);
      }

      // 2. We pull GameElementStruct from chain and verify it is valid resource
      const metaData = await this.blockchainService.getGameElementHash(name);

      if (
        !metaData ||
        metaData.tokenAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Game element metadata for resource ${name} is invalid.`
        );
      }

      // 3. We call BlockchainService to generate signed mint/burn callData for the resource on-chain
      let commitData;

      switch (action) {
        case 'mint':
          console.log(`Generating mint callData for resource [${name}]...`);
          commitData = await this.blockchainService.mintResource(
            name,
            payload.playerAddress,
            metaData.tokenId,
            result.userInventory?.quantity || 1000
          );
          break;
        case 'burn':
          console.log(`Generating burn callData for resource [${name}]...`);
          commitData = await this.blockchainService.burnResource(
            name,
            payload.playerAddress,
            metaData.tokenId,
            result.userInventory?.quantity || 1000
          );
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // 4. Return success signed callData to user for submission to blockchain
      if (commitData && commitData.resourceHash.length > 0) {
        console.log('✅ Generated callData for resource commit:', commitData);
        return { success: true, resource: name, action, commit: commitData };
      }
    } catch (err) {
      console.error(`❌ Crash committing resource [${name}]:`, err);
    }

    // In case of failure
    console.log('❌ Failed to generate callData for resource commit');
    return { success: false, resource: name, action, commit: null };
  }

  async commitCoin(name: string, action: 'mint' | 'burn', payload: any) {
    console.log(`Committing coin [${name}] - action: ${action}`, payload);
    try {
      // 1. We chek such resource exists and user has it in DB
      const result = await this._queryInventory(
        name,
        payload.playerAddress, // assuming playerAddress is used as userId here
        true,
        false
      );
      if (!result.found || !result.userHasIt) {
        throw new Error(`Resource ${name} not found or user does not have it.`);
      }

      // 2. We pull GameElementStruct from chain and verify it is valid resource
      const metaData = await this.blockchainService.getGameElementHash(name);

      if (
        !metaData ||
        metaData.tokenAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Game element metadata for resource ${name} is invalid.`
        );
      }

      // 3. We call BlockchainService to generate signed mint/burn callData for the resource on-chain
      let commitData;

      switch (action) {
        case 'mint':
          console.log(`Generating mint callData for resource [${name}]...`);
          commitData = await this.blockchainService.mintCoins(
            name,
            payload.playerAddress,
            metaData.tokenId,
            result.userInventory?.quantity || 1000
          );
          break;
        case 'burn':
          console.log(`Generating burn callData for resource [${name}]...`);
          commitData = await this.blockchainService.burnCoins(
            name,
            payload.playerAddress,
            metaData.tokenId,
            result.userInventory?.quantity || 1000
          );
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // 4. Return success signed callData to user for submission to blockchain
      if (
        commitData &&
        commitData.characterHash &&
        commitData.characterHash.length > 0
      ) {
        console.log('✅ Generated callData for resource commit:', commitData);
        return { success: true, resource: name, action, commit: commitData };
      }
    } catch (err) {
      console.error(`❌ Crash committing resource [${name}]:`, err);
    }

    // In case of failure
    console.log('❌ Failed to generate callData for resource commit');
    return { success: false, resource: name, action, commit: null };
  }

  async commitItem(name: string, action: 'mint' | 'burn', payload: any) {
    console.log(`\n========== COMMIT ITEMS ==========`);
    console.log(`Committing resource [${name}] - action: ${action}`, payload);
    try {
      // 1. We chek such resource exists and user has it in DB
      const result = await this._queryInventory(
        name,
        payload.playerAddress, // assuming playerAddress is used as userId here
        false,
        false
      );
      if (!result.found || !result.userHasIt) {
        throw new Error(`Resource ${name} not found or user does not have it.`);
      }

      // 2. We pull GameElementStruct from chain and verify it is valid resource
      const metaData = await this.blockchainService.getGameElementHash(name);

      if (
        !metaData ||
        metaData.tokenAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Game element metadata for resource ${name} is invalid.`
        );
      }

      // 3. We call BlockchainService to generate signed mint/burn callData for the resource on-chain
      let commitData;

      switch (action) {
        case 'mint':
          console.log(`Generating mint callData for resource [${name}]...`);
          commitData = await this.blockchainService.mintItem(
            name,
            payload.playerAddress
            //metaData.tokenId
            //result.userInventory?.quantity || 1000
          );
          break;
        case 'burn':
          console.log(`Generating burn callData for resource [${name}]...`);
          commitData = await this.blockchainService.burnItem(
            name,
            payload.playerAddress,
            metaData.tokenId
            //result.userInventory?.quantity || 1000
          );
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // 4. Return success signed callData to user for submission to blockchain
      if (commitData && commitData.itemHash && commitData.itemHash.length > 0) {
        console.log('✅ Generated callData for resource commit:', commitData);
        return { success: true, resource: name, action, commit: commitData };
      }
    } catch (err) {
      console.error(`❌ Crash committing resource [${name}]:`, err);
    }

    // In case of failure
    console.log('❌ Failed to generate callData for resource commit');
    return { success: false, resource: name, action, commit: null };
  }

  async commitCharacter(name: string, action: 'mint' | 'burn', payload: any) {
    console.log(`Committing character [${name}] - action: ${action}`, payload);
    try {
      // 1. We chek such resource exists and user has it in DB
      const result = await this._queryCharacters(
        name,
        payload.playerAddress // assuming playerAddress is used as userId here
      );
      if (!result.found || !result.userHasIt) {
        throw new Error(`Resource ${name} not found or user does not have it.`);
      }

      // 2. We pull GameElementStruct from chain and verify it is valid resource
      const metaData = await this.blockchainService.getGameElementHash(name);

      if (
        !metaData ||
        metaData.tokenAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Game element metadata for resource ${name} is invalid.`
        );
      }

      // 3. We call BlockchainService to generate signed mint/burn callData for the resource on-chain
      let commitData;

      switch (action) {
        case 'mint':
          console.log(`Generating mint callData for resource [${name}]...`);
          commitData = await this.blockchainService.mintCharacter(
            name,
            payload.playerAddress,
            metaData.tokenId
          );
          break;
        case 'burn':
          console.log(`Generating burn callData for resource [${name}]...`);
          commitData = await this.blockchainService.burnCharacter(
            name,
            payload.playerAddress,
            metaData.tokenId
          );
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      // 4. Return success signed callData to user for submission to blockchain
      if (
        commitData &&
        commitData.characterHash &&
        commitData.characterHash.length > 0
      ) {
        console.log('✅ Generated callData for resource commit:', commitData);
        return { success: true, resource: name, action, commit: commitData };
      }
    } catch (err) {
      console.error(`❌ Crash committing resource [${name}]:`, err);
    }

    // In case of failure
    console.log('❌ Failed to generate callData for resource commit');
    return { success: false, resource: name, action, commit: null };
  }

  async commitIinventory(payload: any) {
    try {
      let failedItems: string[] = [];
      let signedData: any[] = [];

      console.log(`Committing inventory sync - payload:`, payload);

      const userId = payload.userId || payload.playerAddress; // Extract userId from payload
      const user = await this.userService.findByAddress(userId);

      console.log(`user: ${JSON.stringify(user)}`);
      const evmAddress = user?.address_evm;

      if (!evmAddress || evmAddress == ethers.ZeroAddress) {
        throw new Error(
          `User ${userId} does not have a valid EVM address for inventory sync.`
        ); // Ensure user has a valid EVM address
      }

      // 1. Query all items from user inventory with full item details in a single query
      // 1.1 Call user inventory service to get all items for this user with combined data
      const userInventoryItems =
        await this.userInventoryService.getUserInventory(userId);

      // 1.2 For each inventory item:
      // - Item type is regestered as resource or item in GameItem collection?
      for (const invItem of userInventoryItems) {
        // Check if it's a resource or item by looking up the GameItem collection
        const metaData = await this.blockchainService.getGameElementHash(
          invItem.itemId
        );

        console.log(`📦 Inventory Item: ${invItem.itemId}`);

        // In case item is not regestered add it failed list and skip.
        if (metaData?.tokenAddress == ethers.ZeroAddress) {
          failedItems.push(invItem.itemId);
          // console.log(
          //   `   ❌ Item ${invItem.itemId} not found in GameItem collection, skipping...`
          // );
          continue;
        }

        const userHasAmount = invItem.quantity || 0;
        // const userHasBalance = await this.blockchainService.getResourceBalance(
        //   evmAddress || ethers.ZeroAddress,
        //   metaData?.tokenId || 0
        // );
        const userHasBalance =
          await this.blockchainService.getGameElementBalance(
            metaData?.tokenId || 0,
            metaData?.tokenAddress || ethers.ZeroAddress,
            metaData?.requiresTokenId || true,
            evmAddress || ethers.ZeroAddress
          );

        console.log(
          `   User has ${userHasAmount} of item ${invItem.itemId} in inventory, on-chain balance: ${userHasBalance}`
        );
        let commitData;
        let amountToBurn;
        if (userHasAmount > 0 && userHasBalance < userHasAmount) {
          // 2. For each item, we call BlockchainService to generate signed mint callData to sync the inventory on-chain
          amountToBurn = userHasAmount - Number(userHasBalance.toString());
          console.log(
            `   Generating mint callData to sync ${userHasAmount} of item ${invItem.itemId}...`
          );
          commitData = await this.blockchainService.mintResource(
            invItem.itemId,
            evmAddress,
            metaData?.tokenId || 0,
            amountToBurn
          );
        } else if (userHasAmount > 0 && userHasBalance > userHasAmount) {
          // If user has more than what's in inventory, we need to burn the excess
          amountToBurn = Number(userHasBalance.toString()) - userHasAmount;
          console.log(
            `   Generating burn callData to remove ${amountToBurn} of item ${invItem.itemId}...`
          );
          commitData = await this.blockchainService.burnResource(
            invItem.itemId,
            evmAddress,
            metaData?.tokenId || 0,
            amountToBurn
          );
        } else {
          continue; // No action needed if balances match or user has none
        }

        signedData.push(commitData);
        console.log(`   Commit data for item ${invItem.itemId}:`, commitData);
      }
      console.log(
        `Failed to sync:`,
        failedItems.length > 0 ? failedItems : 'None'
      );

      return {
        success: true,
        signedData: signedData,
        failedItems: failedItems,
      };
    } catch (err) {
      console.error(`❌ Crash syncing inventory:`, err);
      return {
        success: false,
        error: (err as Error)?.message || 'unknown error',
      };
    }
  }
}

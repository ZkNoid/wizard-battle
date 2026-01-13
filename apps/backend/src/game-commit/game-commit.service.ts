import { Injectable } from '@nestjs/common';
import { GameItemService } from '../game-item/services/game-item.service';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { BlockchainService } from './blockchain.service';
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
    private readonly blockchainService: BlockchainService
  ) {}

  // Generic handler or specific logic per resource type

  /**
   * Helper function to load a resource from the database by name and userId.
   * Prints the resource parameters to console and verifies if the user has it.
   * @param itemName - The name of the game item/resource
   * @param userId - The user ID to check inventory for
   * @returns Object containing the resource, user has it status, and inventory details
   */
  async loadAndVerifyResourceForUserFromDataBase(
    itemName: string,
    userId: string
  ) {
    try {
      // 1. Find the resource by name in the GameItem collection
      const allItems = await this.gameItemService.findAll();
      const resource = allItems.find((item) => item.name === itemName);

      if (!resource) {
        console.log(`❌ Resource "${itemName}" not found in database`);
        return {
          found: false,
          userHasIt: false,
          resource: null,
          inventoryDetails: null,
        };
      }

      // 2. Print resource params to console
      console.log(`📦 Resource loaded from database:`);
      console.log(`   Name: ${resource.name}`);
      console.log(`   Rarity: ${resource.rarity}`);
      console.log(`   Origin: ${resource.origin}`);
      console.log(`   Description: ${resource.desc}`);
      console.log(`   Is Craftable: ${resource.isCraftable}`);
      console.log(`   Resource ID: ${(resource as any)._id}`);

      // 3. Check if user has this resource in their inventory
      const resourceId = (resource as any)._id.toString();
      const userHasIt = await this.userInventoryService.hasItem(
        userId,
        resourceId
      );

      console.log(`\n🔍 Checking user inventory for userId: ${userId}`);
      console.log(
        `   User has "${itemName}": ${userHasIt ? '✅ YES' : '❌ NO'}`
      );

      // 4. Get detailed inventory information if user has it
      let inventoryDetails: any = null;
      if (userHasIt) {
        try {
          inventoryDetails =
            await this.userInventoryService.getUserInventoryItem(
              userId,
              resourceId
            );
          console.log(`   Quantity: ${inventoryDetails.quantity}`);
          console.log(
            `   Is Equipped: ${inventoryDetails.isEquipped || false}`
          );
          console.log(
            `   Acquired From: ${inventoryDetails.acquiredFrom || 'unknown'}`
          );
          console.log(
            `   Acquired At: ${inventoryDetails.acquiredAt || 'unknown'}`
          );
        } catch (error: any) {
          // Item exists but couldn't fetch details
          console.log(
            `   ⚠️ Could not fetch detailed inventory info: ${error?.message || 'unknown error'}`
          );
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
          },
          inventoryDetails: inventoryDetails
            ? {
                quantity: inventoryDetails.quantity,
                isEquipped: inventoryDetails.isEquipped,
                acquiredFrom: inventoryDetails.acquiredFrom,
                acquiredAt: inventoryDetails.acquiredAt,
              }
            : null,
        };
      } else {
        return {
          found: false,
          userHasIt: false,
          resource: null,
          inventoryDetails: null,
        };
      }
    } catch (error: any) {
      console.error(
        `❌ Error loading and verifying resource: ${error?.message || 'unknown error'}`
      );
      throw error;
    }
  }

  async pullGameElemtentStructFromChain(
    name: string
  ): Promise<GameElementStruct | boolean> {
    // Must return something like this:
    //  struct GameElementStruct {
    //     /// @dev Contract address of the token (ERC20/ERC721/ERC1155)
    //     address tokenAddress;
    //     /// @dev Token ID (relevant for ERC721/ERC1155, may be 0 for ERC20)
    //     uint256 tokenId;
    //     /// @dev If true, tokenId must be included in commit data
    //     bool requiresTokenId;
    // }

    //const elementMetaData = await this.blockchainService.getGameElement(name);
    const elementMetaData = {
      // mocked data
      tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
      tokenId: 1,
      requiresTokenId: true,
    };

    return {
      tokenAddress: elementMetaData.tokenAddress,
      tokenId: elementMetaData.tokenId,
      requiresTokenId: elementMetaData.requiresTokenId,
    };
  }

  async commitResource(
    name: string,
    action: 'mint' | 'burn' | 'modify',
    payload: any
  ) {
    console.log(`Committing resource [${name}] - action: ${action}`, payload);
    try {
      // 1. We chek such resource exists and user has it in DB
      const result = await this.loadAndVerifyResourceForUserFromDataBase(
        name,
        payload.playerAddress // assuming playerAddress is used as userId here
      );
      if (!result.found || !result.userHasIt) {
        throw new Error(`Resource ${name} not found or user does not have it.`);
      }

      // 2. We pull GameElementStruct from chain and verify it is valid resource
      const metaData = await this.blockchainService.getGameElement(name);

      if (
        !metaData ||
        metaData.tokenAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Game element metadata for resource ${name} is invalid.`
        );
      }

      // 3. We call BlockchainService to generate signed mint/burn/modify callData for the resource on-chain
      const commitData = await this.blockchainService.mintResource(
        name,
        payload.playerAddress,
        metaData.tokenId,
        result.inventoryDetails?.quantity || 1000
      );

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

  commitCoin(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing coin [${name}] - action: ${action}`, payload);
    return { success: true, coin: name, action, payload };
  }

  commitItem(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing item [${name}] - action: ${action}`, payload);
    return { success: true, item: name, action, payload };
  }

  commitCharacter(
    name: string,
    action: 'mint' | 'burn' | 'modify',
    payload: any
  ) {
    console.log(`Committing character [${name}] - action: ${action}`, payload);
    return { success: true, character: name, action, payload };
  }
}

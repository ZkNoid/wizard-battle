import { Injectable } from '@nestjs/common';
import { GameItemService } from '../game-item/services/game-item.service';
import { UserInventoryService } from '../user-inventory/services/user-inventory.service';
import { BlockchainService } from './blockchain.service';

@Injectable()
export class GameCommitService {
  constructor(
    private readonly gameItemService: GameItemService,
    private readonly userInventoryService: UserInventoryService,
    private readonly blockchainService: BlockchainService,
  ) {}

  // Generic handler or specific logic per resource type

  /**
   * Helper function to load a resource from the database by name and userId.
   * Prints the resource parameters to console and verifies if the user has it.
   * @param itemName - The name of the game item/resource
   * @param userId - The user ID to check inventory for
   * @returns Object containing the resource, user has it status, and inventory details
   */
  async loadAndVerifyResourceForUser(itemName: string, userId: string) {
    try {
      // 1. Find the resource by name in the GameItem collection
      const allItems = await this.gameItemService.findAll();
      const resource = allItems.find(item => item.name === itemName);

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
      const userHasIt = await this.userInventoryService.hasItem(userId, resourceId);

      console.log(`\n🔍 Checking user inventory for userId: ${userId}`);
      console.log(`   User has "${itemName}": ${userHasIt ? '✅ YES' : '❌ NO'}`);

      // 4. Get detailed inventory information if user has it
      let inventoryDetails: any = null;
      if (userHasIt) {
        try {
          inventoryDetails = await this.userInventoryService.getUserInventoryItem(userId, resourceId);
          console.log(`   Quantity: ${inventoryDetails.quantity}`);
          console.log(`   Is Equipped: ${inventoryDetails.isEquipped || false}`);
          console.log(`   Acquired From: ${inventoryDetails.acquiredFrom || 'unknown'}`);
          console.log(`   Acquired At: ${inventoryDetails.acquiredAt || 'unknown'}`);
        } catch (error: any) {
          // Item exists but couldn't fetch details
          console.log(`   ⚠️ Could not fetch detailed inventory info: ${error?.message || 'unknown error'}`);
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
        },
        inventoryDetails: inventoryDetails ? {
          quantity: inventoryDetails.quantity,
          isEquipped: inventoryDetails.isEquipped,
          acquiredFrom: inventoryDetails.acquiredFrom,
          acquiredAt: inventoryDetails.acquiredAt,
        } : null,
      };
    } catch (error: any) {
      console.error(`❌ Error loading and verifying resource: ${error?.message || 'unknown error'}`);
      throw error;
    }
  }

  async commitResource(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing resource [${name}] - action: ${action}`, payload);
    
    // Example: Load and verify resource for the user
    // const result = await this.loadAndVerifyResourceForUser('Wood', 'user123');

    // Mint Wood to the blockchain
    if (action === 'mint' && name === 'Wood') {
      try {
        // Get player address from payload (sent directly, not nested)
        const playerAddress = payload.playerAddress;
        const amount = payload.amount || 1000;

        if (!playerAddress) {
          return {
            success: false,
            resource: name,
            action,
            payload,
            error: 'playerAddress is required in the request body',
          };
        }

        console.log(`🔗 Calling smart contract to mint ${amount} Wood...`);
        
        const tokenId = 2; // Wood token ID (adjust based on your game design)

        const receipt = await this.blockchainService.mintResource(
          'Wood',
          playerAddress,
          tokenId,
          amount,
        );

        console.log(`✅ Successfully minted ${amount} Wood on blockchain`);
        console.log(`Transaction hash: ${receipt.hash}`);

        // Get the new balance
        const balance = await this.blockchainService.getResourceBalance(playerAddress, tokenId);
        console.log(`Player's new Wood balance: ${balance.toString()}`);

        return {
          success: true,
          resource: name,
          action,
          payload,
          blockchain: {
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            balance: balance.toString(),
          },
        };
      } catch (error: any) {
        console.error('❌ Blockchain transaction failed:', error.message);
        return {
          success: false,
          resource: name,
          action,
          payload,
          error: error.message,
        };
      }
    }

    return { success: true, resource: name, action, payload };
  }

  commitCoin(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing coin [${name}] - action: ${action}`, payload);
    return { success: true, coin: name, action, payload };
  }

  commitItem(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing item [${name}] - action: ${action}`, payload);
    return { success: true, item: name, action, payload };
  }

  commitCharacter(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing character [${name}] - action: ${action}`, payload);
    return { success: true, character: name, action, payload };
  }
  
}
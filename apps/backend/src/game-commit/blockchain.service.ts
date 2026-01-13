import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

/**
 * Service for interacting with the blockchain smart contracts
 * Handles minting resources via GameRegistry contract
 */
@Injectable()
export class BlockchainService {
  private provider?: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private gameRegistryAddress: string;
  private wbResourcesAddress: string;

  constructor() {
    // Initialize blockchain connection
    // Make sure to set these environment variables:
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const privateKey = process.env.GAME_SIGNER_PRIVATE_KEY;
    this.gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS || '';
    this.wbResourcesAddress = process.env.WB_RESOURCES_ADDRESS || '';

    if (!privateKey) {
      console.warn('⚠️ GAME_SIGNER_PRIVATE_KEY not set, blockchain features will be disabled');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Mint a resource (like Iron Ore) to a player
   * Follows the same pattern as the Solidity test: test_mintWBResourceToPlayer
   * 
   * @param resourceName - Name of the resource (e.g., "Iron Ore", "Wood")
   * @param playerAddress - Ethereum address of the player
   * @param tokenId - Token ID of the resource (e.g., 1 for Wood, 2 for Iron Ore, etc.)
   * @param amount - Amount to mint
   * @returns Transaction receipt
   */
  async mintResource(
    resourceName: string,
    playerAddress: string,
    tokenId: number,
    amount: number,
  ): Promise<ethers.TransactionReceipt> {
    if (!this.signer) {
      throw new Error('Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY');
    }

    console.log(`🪙 Minting ${amount} ${resourceName} (tokenId: ${tokenId}) to player: ${playerAddress}`);

    // Step 1: Encode callData for mint function
    // mint(address,uint256,uint256,bytes)
    const wbResourcesInterface = new ethers.Interface([
      'function mint(address to, uint256 id, uint256 amount, bytes data)',
    ]);

    const callData = wbResourcesInterface.encodeFunctionData('mint', [
      playerAddress,  // address to
      tokenId,        // uint256 id
      amount,         // uint256 amount
      '0x',           // bytes data (empty)
    ]);

    console.log('📦 Encoded callData:', callData);

    // Step 2: Get signed message (resourceHash, commit, signature)
    const { resourceHash, commit, signature } = await this.getSignedMessage(
      resourceName,
      this.wbResourcesAddress,
      0, // nonce - should be incremented for each transaction
      callData,
      playerAddress,
    );

    console.log('🔐 Resource hash:', resourceHash);
    console.log('📝 Commit:', commit);
    console.log('✍️ Signature:', signature);

    // Step 3: Call gameRegistry.commitResource
    const gameRegistryContract = new ethers.Contract(
      this.gameRegistryAddress,
      [
        'function commitResource(bytes32 resourceHash, bytes commit, bytes signature)',
        'event CommitConfirmed(bytes indexed commit)',
      ],
      this.signer,
    );

    console.log('📡 Calling gameRegistry.commitResource...');

    const tx = await gameRegistryContract.commitResource!(
      resourceHash,
      commit,
      signature,
    );

    console.log('⏳ Waiting for transaction confirmation...');
    console.log('Transaction hash:', tx.hash);

    const receipt = await tx.wait();

    console.log('✅ Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    return receipt;
  }

  /**
   * Get signed message for commit
   * Follows the pattern from Solidity test helper function
   * 
   * @param elementName - Name of the game element (e.g., "Wood", "Iron Ore")
   * @param target - Target contract address (WBResources address)
   * @param nonce - Nonce to prevent replay attacks
   * @param callData - Encoded function call data
   * @param account - Player's address
   * @returns resourceHash, commit, and signature
   */
  private async getSignedMessage(
    elementName: string,
    target: string,
    nonce: number,
    callData: string,
    account: string,
  ): Promise<{ resourceHash: string; commit: string; signature: string }> {
    if (!this.signer || !this.provider) {
      throw new Error('Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY');
    }

    // Calculate resource hash
    const resourceHash = ethers.keccak256(ethers.toUtf8Bytes(elementName));

    // Get signer address
    const signerAddress = await this.signer.getAddress();

    // Encode commit struct
    const commit = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'address', 'uint256', 'bytes'],
      [target, account, signerAddress, nonce, callData],
    );

    // Create EIP-712 domain
    const chainId = (await this.provider!.getNetwork()).chainId;
    
    const domain = {
      name: 'GameRegestry',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: this.gameRegistryAddress,
    };

    // Define EIP-712 types
    const types = {
      CommitStruct: [
        { name: 'target', type: 'address' },
        { name: 'account', type: 'address' },
        { name: 'signer', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'callData', type: 'bytes' },
      ],
    };

    // Create value object
    const value = {
      target,
      account,
      signer: signerAddress,
      nonce,
      callData,
    };

    // Sign typed data
    const signature = await this.signer.signTypedData(domain, types, value);

    return { resourceHash, commit, signature };
  }

  /**
   * Get the balance of a resource for a player
   * 
   * @param playerAddress - Player's Ethereum address
   * @param tokenId - Token ID of the resource
   * @returns Balance amount
   */
  async getResourceBalance(playerAddress: string, tokenId: number): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY');
    }

    const wbResourcesContract = new ethers.Contract(
      this.wbResourcesAddress,
      ['function balanceOf(address account, uint256 id) view returns (uint256)'],
      this.provider,
    );

    const balance = await wbResourcesContract.balanceOf!(playerAddress, tokenId);
    return balance;
  }
}

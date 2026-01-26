import { Injectable } from '@nestjs/common';
import { ethers, keccak256 } from 'ethers';

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
  private wbItemsAddress: string;
  private wbCharactersAddress: string;
  private wbCoinsAddress: string;

  constructor() {
    // Initialize blockchain connection
    // Make sure to set these environment variables:
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const privateKey = process.env.GAME_SIGNER_PRIVATE_KEY;
    this.gameRegistryAddress = process.env.GAME_REGISTRY_ADDRESS || '';
    this.wbResourcesAddress = process.env.WB_RESOURCES_ADDRESS || '';
    this.wbItemsAddress = process.env.WB_ITEMS_ADDRESS || '';
    this.wbCharactersAddress = process.env.WB_CHARACTERS_ADDRESS || '';
    this.wbCoinsAddress = process.env.WB_COINS_ADDRESS || '';

    if (!privateKey) {
      console.warn(
        '⚠️ GAME_SIGNER_PRIVATE_KEY not set, blockchain features will be disabled'
      );
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
    amount: number
  ): Promise<{ resourceHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._mint(
      resourceName,
      playerAddress,
      this.wbResourcesAddress,
      tokenId,
      amount
    );

    return {
      resourceHash: nameHash,
      commit,
      signature,
    };
  }

  async burnResource(
    resourceName: string,
    playerAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ resourceHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._burn(
      resourceName,
      playerAddress,
      this.wbResourcesAddress,
      tokenId,
      amount
    );

    return {
      resourceHash: nameHash,
      commit,
      signature,
    };
  }

  async mintItem(
    itemName: string,
    playerAddress: string
  ): Promise<{ itemHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._mintERC721(
      itemName,
      playerAddress,
      this.wbItemsAddress
    );
    return { itemHash: nameHash, commit, signature };
  }

  async burnItem(
    itemName: string,
    playerAddress: string,
    tokenId: number
  ): Promise<{ itemHash: string; commit: string; signature: string }> {
    // For ERC721, query which tokenId the player actually owns
    const actualTokenId = await this._getPlayerERC721TokenId(
      this.wbItemsAddress,
      playerAddress,
      itemName
    );

    const { nameHash, commit, signature } = await this._burnERC721(
      itemName,
      playerAddress,
      this.wbItemsAddress,
      actualTokenId
    );
    return { itemHash: nameHash, commit, signature };
  }

  async mintCharacter(
    characterName: string,
    playerAddress: string,
    tokenId: number
  ): Promise<{ characterHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._mintERC721(
      characterName,
      playerAddress,
      this.wbCharactersAddress
    );
    return { characterHash: nameHash, commit, signature };
  }

  async burnCharacter(
    characterName: string,
    playerAddress: string,
    tokenId: number
  ): Promise<{ characterHash: string; commit: string; signature: string }> {
    // For ERC721, query which tokenId the player actually owns
    const actualTokenId = await this._getPlayerERC721TokenId(
      this.wbCharactersAddress,
      playerAddress,
      characterName
    );

    const { nameHash, commit, signature } = await this._burnERC721(
      characterName,
      playerAddress,
      this.wbCharactersAddress,
      actualTokenId
    );

    return { characterHash: nameHash, commit, signature };
  }

  async mintCoins(
    characterName: string,
    playerAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ characterHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._mint(
      characterName,
      playerAddress,
      this.wbCoinsAddress,
      tokenId,
      amount
    );
    return { characterHash: nameHash, commit, signature };
  }

  async burnCoins(
    characterName: string,
    playerAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ characterHash: string; commit: string; signature: string }> {
    const { nameHash, commit, signature } = await this._burn(
      characterName,
      playerAddress,
      this.wbCoinsAddress,
      tokenId,
      amount
    );

    return { characterHash: nameHash, commit, signature };
  }

  /**
   * Get the balance of a resource for a player
   *
   * @param playerAddress - Player's Ethereum address
   * @param tokenId - Token ID of the resource
   * @returns Balance amount
   */
  async getResourceBalance(
    playerAddress: string,
    tokenId: number
  ): Promise<bigint> {
    if (!this.provider) {
      throw new Error(
        'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
      );
    }

    const wbResourcesContract = new ethers.Contract(
      this.wbResourcesAddress,
      [
        'function balanceOf(address account, uint256 id) view returns (uint256)',
      ],
      this.provider
    );

    const balance = await wbResourcesContract.balanceOf!(
      playerAddress,
      tokenId
    );
    return balance;
  }

  async getGameElement(name: string): Promise<{
    tokenAddress: string;
    tokenId: number;
    requiresTokenId: boolean;
  } | null> {
    if (!this.provider) {
      throw new Error(
        'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
      );
    }

    const gameRegistryContract = new ethers.Contract(
      this.gameRegistryAddress,
      [
        // GameElementStruct is: (address tokenAddress, uint256 tokenId, bool requiresTokenId)
        'function getGameElement(bytes32 resourceHash) external view returns (tuple(address tokenAddress, uint256 tokenId, bool requiresTokenId))',
      ],
      this.provider
    );

    const resourceHash = keccak256(ethers.toUtf8Bytes(name));
    console.log(`🔍 [getGameElement] Fetching element for "${name}"`);
    console.log(`   Resource hash: ${resourceHash}`);

    const result = await gameRegistryContract.getGameElement!(resourceHash);

    console.log(`🔍 [getGameElement] Raw result:`, result);

    const parsedResult = {
      tokenAddress: result.tokenAddress || result[0],
      tokenId: Number(result.tokenId || result[1]),
      requiresTokenId: result.requiresTokenId ?? result[2],
    };

    console.log(`🔍 [getGameElement] Parsed result:`, parsedResult);

    return parsedResult;
  }

  /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  private async _mint(
    name: string,
    playerAddress: string,
    contractAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ nameHash: string; commit: string; signature: string }> {
    try {
      if (!this.signer) {
        throw new Error(
          'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
        );
      }

      console.log(
        `🪙 Minting ${amount} ${name} (tokenId: ${tokenId}) to player: ${playerAddress}`
      );

      // Step 1: Encode callData for mint function
      // mint(address,uint256,uint256,bytes)
      const contractInterface = new ethers.Interface([
        'function mint(address to, uint256 id, uint256 amount, bytes data)',
      ]);

      const callData = contractInterface.encodeFunctionData('mint', [
        playerAddress, // address to
        tokenId, // uint256 id
        amount, // uint256 amount
        '0x', // bytes data (empty)
      ]);

      console.log('📦 Encoded callData:', callData);

      // Step 2: Get signed message (resourceHash, commit, signature)
      // Generate unique nonce using timestamp to prevent replay attacks
      const nonce = Date.now();

      const { nameHash, commit, signature } = await this._getSignedMessage(
        name,
        contractAddress,
        nonce,
        callData,
        playerAddress
      );

      console.log('🔐 Resource hash:', nameHash);
      console.log('📝 Commit:', commit);
      console.log('✍️ Signature:', signature);

      return { nameHash, commit, signature };
    } catch (error) {
      console.error('❌ Error minting resource:', error);
    }
    return { nameHash: '', commit: '', signature: '' };
  }

  private async _burn(
    name: string,
    playerAddress: string,
    contractAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ nameHash: string; commit: string; signature: string }> {
    try {
      if (!this.signer) {
        throw new Error(
          'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
        );
      }

      console.log(
        `🪙 Minting ${amount} ${name} (tokenId: ${tokenId}) to player: ${playerAddress}`
      );

      // Step 1: Encode callData for mint function
      // mint(address,uint256,uint256,bytes)
      const contractInterface = new ethers.Interface([
        'function burn(address account, uint256 id, uint256 value)',
      ]);

      const callData = contractInterface.encodeFunctionData('burn', [
        playerAddress, // address to
        tokenId, // uint256 id
        amount, // uint256 amount
      ]);

      console.log('📦 Encoded callData:', callData);

      // Step 2: Get signed message (resourceHash, commit, signature)
      // Generate unique nonce using timestamp to prevent replay attacks
      const nonce = Date.now();

      const { nameHash, commit, signature } = await this._getSignedMessage(
        name,
        contractAddress,
        nonce,
        callData,
        playerAddress
      );

      console.log('🔐 Resource hash:', nameHash);
      console.log('📝 Commit:', commit);
      console.log('✍️ Signature:', signature);

      return { nameHash, commit, signature };
    } catch (error) {
      console.error('❌ Error minting resource:', error);
    }
    return { nameHash: '', commit: '', signature: '' };
  }

  private async _mintERC721(
    name: string,
    playerAddress: string,
    contractAddress: string
  ): Promise<{ nameHash: string; commit: string; signature: string }> {
    try {
      if (!this.signer) {
        throw new Error(
          'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
        );
      }

      console.log(`🪙 Minting ${name} (ERC721) to player: ${playerAddress}`);

      // Step 1: Encode callData for ERC721 mint function: mint(address to)
      const contractInterface = new ethers.Interface([
        'function mint(address to) returns (uint256)',
      ]);

      const callData = contractInterface.encodeFunctionData('mint', [
        playerAddress, // address to
      ]);

      console.log('📦 Encoded callData:', callData);

      // Step 2: Get signed message (nameHash, commit, signature)
      // Generate unique nonce using timestamp to prevent replay attacks
      const nonce = Date.now();

      const { nameHash, commit, signature } = await this._getSignedMessage(
        name,
        contractAddress,
        nonce,
        callData,
        playerAddress
      );

      console.log('🔐 Character hash:', nameHash);
      console.log('📝 Commit:', commit);
      console.log('✍️ Signature:', signature);

      return { nameHash, commit, signature };
    } catch (error) {
      console.error('❌ Error minting character:', error);
    }
    return { nameHash: '', commit: '', signature: '' };
  }

  private async _burnERC721(
    name: string,
    playerAddress: string,
    contractAddress: string,
    tokenId: number
  ): Promise<{ nameHash: string; commit: string; signature: string }> {
    try {
      if (!this.signer) {
        throw new Error(
          'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
        );
      }

      console.log(
        `🔥 Burning ${name} (ERC721) tokenId ${tokenId} from player: ${playerAddress}`
      );

      // Step 1: Encode callData for ERC721 burn function: burn(uint256 tokenId)
      const contractInterface = new ethers.Interface([
        'function burn(uint256 tokenId)',
      ]);

      const callData = contractInterface.encodeFunctionData('burn', [tokenId]);

      console.log('📦 Encoded callData:', callData);

      // Step 2: Get signed message (nameHash, commit, signature)
      // Generate unique nonce using timestamp to prevent replay attacks
      const nonce = Date.now();

      const { nameHash, commit, signature } = await this._getSignedMessage(
        name,
        contractAddress,
        nonce,
        callData,
        playerAddress
      );

      console.log('🔐 Character hash:', nameHash);
      console.log('📝 Commit:', commit);
      console.log('✍️ Signature:', signature);

      return { nameHash, commit, signature };
    } catch (error) {
      console.error('❌ Error burning character:', error);
    }
    return { nameHash: '', commit: '', signature: '' };
  }

  /**
   * Get the first tokenId owned by a player for a given ERC721 contract
   * @param contractAddress ERC721 contract address
   * @param playerAddress Player's address
   * @param name Name of the item/character (for error messages)
   * @returns The tokenId owned by the player
   * TODO: replace with updating token id of item, resource, character in DB after minting
   * read actual tokenId from DB before burning
   */
  private async _getPlayerERC721TokenId(
    contractAddress: string,
    playerAddress: string,
    name: string
  ): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const erc721Contract = new ethers.Contract(
      contractAddress,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      ],
      this.provider
    );

    const balance = await erc721Contract.balanceOf!(playerAddress);

    if (balance === 0n) {
      throw new Error(
        `Player ${playerAddress} does not own any ${name} tokens`
      );
    }

    // Get the first token owned by the player
    const tokenId = await erc721Contract.tokenOfOwnerByIndex!(playerAddress, 0);

    console.log(
      `🔍 Found tokenId ${tokenId} for ${name} owned by ${playerAddress}`
    );

    return Number(tokenId);
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
  private async _getSignedMessage(
    elementName: string,
    target: string,
    nonce: number,
    callData: string,
    account: string
  ): Promise<{ nameHash: string; commit: string; signature: string }> {
    if (!this.signer || !this.provider) {
      throw new Error(
        'Blockchain service not initialized. Please set GAME_SIGNER_PRIVATE_KEY'
      );
    }

    // Calculate resource hash
    const nameHash = ethers.keccak256(ethers.toUtf8Bytes(elementName));

    // Get signer address
    const signerAddress = await this.signer.getAddress();

    // Encode commit struct
    const commit = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'address', 'uint256', 'bytes'],
      [target, account, signerAddress, nonce, callData]
    );

    // Create EIP-712 domain
    const chainId = (await this.provider!.getNetwork()).chainId;

    const domain = {
      name: 'GameRegistry',
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

    // Sign typed data using proper EIP-712
    const signature = await this.signer.signTypedData(domain, types, value);

    return { nameHash, commit, signature };
  }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IGameRegistry
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Interface for the GameRegistry contract
 */
interface IGameRegistry {
    /*//////////////////////////////////////////////////////////////
                               ERRORS
    //////////////////////////////////////////////////////////////*/

    error GameRegistry__AdminRoleRevokeNotAllowed();
    error GameRegistry__AdminRoleGrantNotAllowed();
    error GameRegistry__AdminRoleRenounceNotAllowed();
    error GameRegistry__OnlyGameSignerRole();
    error GameRegistry__OnlyGameSignerOrMarketRole();
    error GameRegistry__InvalidSignatureMessage();
    error GameRegistry__CommitFailed();
    error GameRegistry__InvalidTarget();
    error GameRegistry__InvalidPlayer();
    error GameRegistry__InvalidSigner();
    error GameRegistry__InvalidCommitData();
    error GameRegistry__InvalidResource();
    error GameRegistry__NonceAlreadyUsed();
    error GameRegistry__InvalidGameSigner();
    error GameRegistry__NotAllowedToCommit();
    error GameRegistry__BatchLengthZero();
    error GameRegistry__BatchLengthTooLong();
    error GameRegistry__InvalidNonce();
    error GameRegistry__GameElementExists();
    error GameRegistry__GameElementIndexOuntOfRange();
    error GameRegistry__AddressZero();
    error GameRegistry__GameElementNameIsEmpty();
    error GameRegistry__UnknownTargetAddress();
    error GameRegistry__NotSigner();

    /*//////////////////////////////////////////////////////////////
                               ENUMS
    //////////////////////////////////////////////////////////////*/

    enum GameElementType {
        COIN,
        RESOURCE,
        CHARACTER,
        UNIQUE_ITEM
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct GameElementStruct {
        address tokenAddress;
        uint256 tokenId;
        bool requiresTokenId;
    }

    struct CommitStruct {
        address target;
        address account;
        address signer;
        uint256 nonce;
        bytes32 callData;
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    event Commit(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);
    event RemoveGameElement(bytes32 indexed nameHash);

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the GameRegistry contract
     * @param _coins Array of coin names available within the game (ERC20 tokens)
     * @param _resources Array of resource names available within the game (ERC1155 tokens)
     * @param _characters Array of character type names available within the game (ERC721 tokens)
     * @param _uiniqueItems Array of unique item names available within the game
     * @param _gameSigner Address to be granted GAME_SIGNER_ROLE for signature verification
     */
    function initialize(
        string[] memory _coins,
        string[] memory _resources,
        string[] memory _characters,
        string[] memory _uiniqueItems,
        address _gameSigner
    ) external;

    /**
     * @notice Processes a batch of resource commits to the registry
     * @param nonce Unique identifier to prevent replay attacks (must not be zero or previously used)
     * @param batch Array of encoded commit data (resourceHash, commit, signature)
     */
    function commitBatch(uint256 nonce, bytes[] calldata batch) external;

    /**
     * @notice Commits a single resource transaction to the registry
     * @param resourceHash Keccak256 hash of the resource name
     * @param commit Encoded commit data (target, account, signer, nonce, callData)
     * @param signature EIP-712 signature from authorized game signer
     */
    function commitSingle(bytes32 resourceHash, bytes memory commit, bytes memory signature) external;

    /**
     * @notice Removes a game element from the registry
     * @param elementType The type category of the game element to remove
     * @param index The index of the element in the type array
     */
    function removeGameElement(GameElementType elementType, uint256 index) external;

    /**
     * @notice Registers a new game element on-chain for off-chain reference
     * @param elementType The type category to register this element under
     * @param name Human-readable name of the game element
     * @param elementTokenAddress Contract address of the token (must not be zero)
     * @param elementTokenId Token ID (if applicable for ERC721/ERC1155)
     * @param elementHasTokenId Whether this element type requires a token ID
     */
    function addGameElement(
        GameElementType elementType,
        string calldata name,
        address elementTokenAddress,
        uint256 elementTokenId,
        bool elementHasTokenId
    ) external;

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the list of all registered game coins
     * @return Array of coin names available in the game
     */
    function getGameCoinsList() external view returns (string[] memory);

    /**
     * @notice Retrieves the list of all registered game resources
     * @return Array of resource names available in the game
     */
    function getResourcesList() external view returns (string[] memory);

    /**
     * @notice Retrieves the list of all registered game characters
     * @return Array of character type names available in the game
     */
    function getCharactersList() external view returns (string[] memory);

    /**
     * @notice Retrieves the list of all registered unique items
     * @return Array of unique item names available in the game
     */
    function getUniqueItemsList() external view returns (string[] memory);

    /**
     * @notice Retrieves game element details by resource hash
     * @param resourceHash Keccak256 hash of the element name
     * @return GameElementStruct containing token address, token ID, and requirements
     */
    function getGameElement(bytes32 resourceHash) external view returns (GameElementStruct memory);

    /**
     * @notice Checks if a nonce has been used in a previous commit
     * @param nonce The nonce to check
     * @return bool True if nonce has been used, false otherwise
     */
    function getIsNonceUsed(uint256 nonce) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the maximum allowed batch length for commit operations
     * @return uint256 Maximum number of commits allowed in a single batch (100)
     */
    function getBatchMaxLength() external pure returns (uint256);
}

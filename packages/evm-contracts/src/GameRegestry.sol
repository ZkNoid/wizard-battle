// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {StringArray} from "./libraries/StringArray.sol";

/**
 * Need to apply for CEI principles: Check, Effect, Interaction or PRE-PI-CHECK (Pre-post interaction check) principles:
 * Check, Effect, Interaction
 */

/**
 * @title Game Regestry
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Main game regestry contract, that consist of all game on-chain resources.
 * @dev What contract must do:
 * - Regester resource (game element) to the regestry
 * - Add game elements parameters to the regestry
 * - Remove game elements from the regestry
 * - Commit game element to the regestry, this function is the main entry point if verified can mint tokens, nfts, etc
 * - Verify signature of the commit data, signer must be GAME_SIGNER_ROLE
 * - Get game elements from the regestry.
 * - Commit marketplace transactions of game elements.
 * @dev possible invariants:
 * @dev roles and limitations:
 * - OWNER: can revoke / grant DEFAULT_ADMIN_ROLE
 * - DEFAULT_ADMIN_ROLE: can revoke / grant roles
 * - GAME_SIGNER_ROLE: can sign commit data, to mint, burn, transfer, etc game elements
 * - MARKET_ROLE: can sign commit marketplace transactions only for game elements that are registered in the regestry
 */
contract GameRegestry is Initializable, AccessControlDefaultAdminRulesUpgradeable, EIP712Upgradeable, ReentrancyGuard, UUPSUpgradeable {
    using StringArray for string[];

    /*//////////////////////////////////////////////////////////////
                               ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when attempting to revoke admin role in an unauthorized way
    error GameRegestry__AdminRoleRevokeNotAllowed();
    /// @dev Thrown when attempting to grant admin role in an unauthorized way
    error GameRegestry__AdminRoleGrantNotAllowed();
    /// @dev Thrown when attempting to renounce admin role (not allowed)
    error GameRegestry__AdminRoleRenounceNotAllowed();
    /// @dev Thrown when caller doesn't have GAME_SIGNER_ROLE
    error GameRegestry__OnlyGameSignerRole();
    /// @dev Thrown when caller doesn't have GAME_SIGNER_ROLE or MARKET_ROLE
    error GameRegestry__OnlyGameSignerOrMarketRole();
    /// @dev Thrown when signature verification fails
    error GameRegestry__InvalidSignatureMessage();
    /// @dev Thrown when commit transaction execution fails
    error GameRegestry__CommitFailed();
    /// @dev Thrown when target address is invalid or zero
    error GameRegestry__InvalidTarget();
    /// @dev Thrown when player/account address is invalid or zero
    error GameRegestry__InvalidPlayer();
    /// @dev Thrown when signer address doesn't have required role
    error GameRegestry__InvalidSigner();
    /// @dev Thrown when commit data is malformed or empty
    error GameRegestry__InvalidCommitData();
    /// @dev Thrown when resource hash doesn't match any registered game element
    error GameRegestry__InvalidResource();
    /// @dev Thrown when attempting to use a nonce that's already been used
    error GameRegestry__NonceAlreadyUsed();
    /// @dev Thrown when game signer address is invalid during initialization
    error GameRegestry__InvalidGameSigner();
    /// @dev Thrown when account with special roles tries to commit
    error GameRegestry__NotAllowedToCommit();
    /// @dev Thrown when batch array is empty
    error GameRegestry__BatchLengthZero();
    /// @dev Thrown when batch array exceeds maximum allowed length
    error GameRegestry__BatchLengthTooLong();
    /// @dev Thrown when nonce is zero or invalid
    error GameRegestry__InvalidNonce();
    /// @dev Thrown when attempting to add a game element that already exists
    error GameRegestry__GameElementExists();
    /// @dev Thrown when game element index is out of range
    error GameRegestry__GameElementIndexOuntOfRange();
    /// @dev Thrown when address parameter is zero address
    error GameRegestry__AddressZero();
    /// @dev Thrown when game element name is empty string
    error GameRegestry__GameElementNameIsEmpty();
    /// @dev Thrown when target address doesn't match registered token address
    error GameRegestry__UnknownTargetAddress();
    /// @dev Thrown when signature recovery fails or signer doesn't match
    error GameRegestry__NotSigner();
    /*//////////////////////////////////////////////////////////////
                               ENUMS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Types of game elements that can be registered in the system
     * @dev Used to categorize different game assets for organizational purposes
     */
    enum GameElementType {
        COIN, /// @dev In-game currency tokens (ERC20)
        RESOURCE, /// @dev Game resources (ERC1155)
        CHARACTER, /// @dev Character NFTs (ERC721)
        UNIQUE_ITEM /// @dev Unique/special items (ERC1155 or ERC721)
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Unified structure for any type of game element
     * @dev Stores the contract address and token information for game assets
     */
    struct GameElementStruct {
        /// @dev Contract address of the token (ERC20/ERC721/ERC1155)
        address tokenAddress;
        /// @dev Token ID (relevant for ERC721/ERC1155, may be 0 for ERC20)
        uint256 tokenId;
        /// @dev If true, tokenId must be included in commit data
        bool requiresTokenId;
    }

    /**
     * @notice Structure for commit data that gets signed and verified
     * @dev Used in EIP-712 signature verification for secure commits
     */
    struct CommitStruct {
        /// @dev Target token contract address to interact with
        address target;
        /// @dev Player account that owns or will receive the resources
        address account;
        /// @dev Authorized game signer address
        address signer;
        /// @dev Unique nonce to prevent replay attacks
        uint256 nonce;
        /// @dev Encoded function call data for the target contract
        bytes callData;
    }

    /*//////////////////////////////////////////////////////////////
                               MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mapping of game element types to their respective name arrays
     * @dev Provides informational list of available game elements to game client/market
     *      Only GAME_SIGNER_ROLE can add/remove game elements from these lists
     */
    mapping(GameElementType => string[]) private s_gameElementsByType;

    /**
     * @notice Mapping of hashed element names to their GameElementStruct data
     * @dev Client calls view functions to get GameElementStruct for building commit data
     *      Key is keccak256 hash of the element name string
     */
    mapping(bytes32 => GameElementStruct) private s_resourceHashToGameElement;

    /**
     * @notice Tracks used nonces to prevent replay attacks
     * @dev Once a nonce is used in a commit, it's marked true and cannot be reused
     */
    mapping(uint256 => bool) private s_usedNonces;

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Role identifier for marketplace contract interactions (TODO: verify if still needed)
    bytes32 private constant MARKET_ROLE = keccak256("MARKET_ROLE");

    /// @dev Role identifier for authorized game signers who can sign commit messages
    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");

    /// @dev EIP-712 typehash for CommitStruct used in signature verification
    bytes32 private constant MESSAGE_TYPEHASH = keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");

    /// @dev Maximum number of commits allowed in a single batch to prevent gas exhaustion
    uint256 private constant BATCH_LENGTH_MAX = 100;
    //address private s_market; // use hasRole MARKET_ROLE to commit marketplace transactions
    //address private s_gameSigner; // use hasRole GAME_SIGNER_ROLE to verify signature of the message from a player

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when resources are committed to the registry
     * @param commit The commit data that was processed
     */
    event CommitResources(bytes indexed commit);

    /**
     * @notice Emitted when a batch of commits is processed
     * @param nonce The nonce associated with this batch
     * @param commits Array of commit data in the batch
     */
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);

    /**
     * @notice Emitted when admin role is revoked from an account
     * @param account Address that had admin role revoked
     */
    event RevokeAdminRole(address indexed account);

    /**
     * @notice Emitted when admin role is granted to an account
     * @param account Address that was granted admin role
     */
    event GrantAdminRole(address indexed account);

    /**
     * @notice Emitted when a commit is successfully confirmed and executed
     * @param commit The commit data that was confirmed
     */
    event CommitConfirmed(bytes indexed commit);

    /**
     * @notice Emitted when a commit is rejected
     * @param commit The commit data that was rejected
     */
    event CommitRejected(bytes indexed commit);

    /**
     * @notice Emitted when a new game element is added to the registry
     * @param nameHash Keccak256 hash of the element name
     * @param tokenAddress Contract address of the token
     * @param tokenId Token ID (if applicable)
     * @param requiresTokenId Whether this element requires a token ID
     */
    event AddGameElement(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);

    /**
     * @notice Emitted when a game element is removed from the registry
     * @param nameHash Keccak256 hash of the element name
     */
    event RemoveGameElement(bytes32 indexed nameHash);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE
     */
    modifier onlyGameSignerRole() {
        if (!hasRole(GAME_SIGNER_ROLE, _msgSender())) {
            revert GameRegestry__OnlyGameSignerRole();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor

    constructor() {
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the GameRegestry contract
     * @dev Sets up EIP-712 domain, access control, and registers initial game elements.
     *      Can only be called once due to initializer modifier.
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
    )
        external
        initializer
    {
        __EIP712_init("GameRegestry", "1");
        __AccessControlDefaultAdminRules_init(1 days, msg.sender);

        s_gameElementsByType[GameElementType.COIN] = _coins;
        s_gameElementsByType[GameElementType.RESOURCE] = _resources;
        s_gameElementsByType[GameElementType.CHARACTER] = _characters;
        s_gameElementsByType[GameElementType.UNIQUE_ITEM] = _uiniqueItems;

        if (_gameSigner == address(0)) {
            revert GameRegestry__InvalidGameSigner();
        }
        _grantRole(GAME_SIGNER_ROLE, _gameSigner);
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Processes a batch of resource commits to the registry
     * @dev Uses reentrancy guard. Validates batch size and nonce before processing.
     *      Each batch item is decoded and processed individually.
     * @param nonce Unique identifier to prevent replay attacks (must not be zero or previously used)
     * @param batch Array of encoded commit data (resourceHash, commit, signature)
     */
    function commitBatch(uint256 nonce, bytes[] calldata batch) external nonReentrant {
        if (nonce == 0) {
            revert GameRegestry__InvalidNonce();
        }
        if (batch.length == 0) {
            revert GameRegestry__BatchLengthZero();
        }
        if (batch.length > BATCH_LENGTH_MAX) {
            revert GameRegestry__BatchLengthTooLong();
        }
        s_usedNonces[nonce] = true;

        emit CommitBatch(nonce, batch);

        for (uint256 i = 0; i < batch.length;) {
            (bytes32 resourceHash, bytes memory commit, bytes memory signature) = abi.decode(batch[i], (bytes32, bytes, bytes));
            _commitResource(resourceHash, commit, signature);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Commits a single resource transaction to the registry
     * @dev Uses reentrancy guard and verifies signature before executing.
     *      TODO: Consider implementing FREI-PI CHECK (Pre-post interaction check) principles
     * @param resourceHash Keccak256 hash of the resource name
     * @param commit Encoded commit data (target, account, signer, nonce, callData)
     * @param signature EIP-712 signature from authorized game signer
     */
    function commitResource(bytes32 resourceHash, bytes memory commit, bytes memory signature) external nonReentrant {
        _commitResource(resourceHash, commit, signature);
    }

    /**
     * @notice Removes a game element from the registry
     * @dev Can only be called by addresses with GAME_SIGNER_ROLE.
     *      Removes from both the type array and the hash mapping.
     * @param elementType The type category of the game element to remove
     * @param index The index of the element in the type array
     */
    function removeGameElement(GameElementType elementType, uint256 index) external onlyGameSignerRole {
        string[] memory elementsNames = s_gameElementsByType[elementType];

        if (index > elementsNames.length - 1) {
            revert GameRegestry__GameElementIndexOuntOfRange();
        }

        string memory elementName = elementsNames[index];
        bytes32 elementNameHash = _hashString(elementName);

        s_gameElementsByType[elementType].removeByIndex(index);

        delete s_resourceHashToGameElement[elementNameHash];

        emit RemoveGameElement(elementNameHash);
    }

    /**
     * @notice Registers a new game element on-chain for off-chain reference
     * @dev Can only be called by addresses with GAME_SIGNER_ROLE.
     *      Game server uses this data for commit generation.
     *      Validates that element doesn't already exist and has valid parameters.
     * @param elementType The type category to register this element under
     * @param name Human-readable name of the game element
     * @param elementTokenAddress Contract address of the token (must not be zero)
     * @param elementTokenId Token ID (if applicable for ERC721/ERC1155)
     * @param elementHasTokenId Whether this element type requires a token ID
     */
    function addGameElement(
        GameElementType elementType,
        string memory name,
        address elementTokenAddress,
        uint256 elementTokenId,
        bool elementHasTokenId
    )
        external
        onlyGameSignerRole
    {
        if (elementTokenAddress == address(0)) {
            revert GameRegestry__AddressZero();
        }

        if (_hashString(name) == _hashString("")) {
            revert GameRegestry__GameElementNameIsEmpty();
        }

        // convert name to bytes32 hash
        bytes32 nameHash = _hashString(name);

        // reads the element struct
        GameElementStruct memory elementStruct = s_resourceHashToGameElement[nameHash];

        // check already exists
        if (elementStruct.tokenAddress != address(0)) {
            revert GameRegestry__GameElementExists();
        }

        // regestr element name in the specified type array for external reference
        s_gameElementsByType[elementType].push(name);

        // updates or add element structure to s_resourceHashToGameElement
        s_resourceHashToGameElement[nameHash] =
            GameElementStruct({tokenAddress: elementTokenAddress, tokenId: elementTokenId, requiresTokenId: elementHasTokenId});

        emit AddGameElement(nameHash, elementTokenAddress, elementTokenId, elementHasTokenId);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Internal function to process a resource commit
     * @param resourceHash Keccak256 hash of the resource name
     * @param commit Encoded commit data
     * @param signature EIP-712 signature for verification
     */
    function _commitResource(bytes32 resourceHash, bytes memory commit, bytes memory signature) private {
        if (resourceHash == bytes32(0) || commit.length == 0 || signature.length == 0) {
            revert GameRegestry__InvalidCommitData();
        }

        (uint256 nonce, address target, bytes memory callData) = _verifyInputs(resourceHash, commit, signature);

        emit CommitResources(commit);
        s_usedNonces[nonce] = true;
        _commitDispatcher(target, callData);

        _verifyAfter();
    }

    /**
     * @dev Dispatches the commit call to the target contract
     * @param target Target token contract address
     * @param callData Encoded function call data to execute
     */
    function _commitDispatcher(address target, bytes memory callData) private {
        if (target == address(0)) {
            revert GameRegestry__InvalidTarget();
        }
        emit CommitConfirmed(callData);
        (bool success,) = target.call(callData);
        if (!success) {
            revert GameRegestry__CommitFailed();
        }
    }

    /**
     * @dev Post-commit invariant verification (currently placeholder)
     * @dev TODO: Identify and implement core invariants verification:
     *      - ERC20 token supply changes match expected amounts
     *      - ERC721 token supply changes match expected amounts
     *      - ERC1155 token supply changes match expected amounts
     */
    function _verifyAfter() private {
        // Possible invariants to verify (not specificly to this contractm, but to the protocol):
        // - ERC20 tokens supply did not changed / or changed by the expected amount
        // - ERC721 tokens supply did not changed / or changed by the expected amount
        // - ERC1155 tokens supply did not changed / or changed by the expected amount
    }

    /**
     * @dev Verifies all inputs of commit data including signature, nonce, and addresses
     * @param resourceHash Hash of the resource being committed
     * @param commit Encoded commit data
     * @param signature Signature to verify
     * @return nonce The verified nonce from commit data
     * @return target The verified target address
     * @return callData The verified call data
     */
    function _verifyInputs(
        bytes32 resourceHash,
        bytes memory commit,
        bytes memory signature
    )
        private
        view
        returns (uint256 nonce, address target, bytes memory callData)
    {
        GameElementStruct memory gameElement = s_resourceHashToGameElement[resourceHash];
        address account;
        address signer;

        (target, account, signer, nonce, callData) = abi.decode(commit, (address, address, address, uint256, bytes));

        if (s_usedNonces[nonce]) {
            revert GameRegestry__NonceAlreadyUsed();
        }
        if (gameElement.tokenAddress == address(0)) {
            revert GameRegestry__InvalidResource();
        }
        if (target == address(0)) {
            revert GameRegestry__InvalidTarget();
        }
        if (target != gameElement.tokenAddress) {
            revert GameRegestry__UnknownTargetAddress();
        }
        if (account == address(0)) {
            revert GameRegestry__InvalidPlayer();
        }
        if (!hasRole(GAME_SIGNER_ROLE, signer)) {
            revert GameRegestry__InvalidSigner();
        }

        if (hasRole(MARKET_ROLE, account) || hasRole(GAME_SIGNER_ROLE, account)) {
            revert GameRegestry__NotAllowedToCommit();
        }
        if (!_verifySignature(target, account, signer, nonce, callData, signature)) {
            revert GameRegestry__InvalidSignatureMessage();
        }

        return (nonce, target, callData);
    }

    /*//////////////////////////////////////////////////////////////
                         PRIVATE VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Verifies EIP-712 signature of commit data
     * @param target Target token contract address
     * @param account Player account address (resource owner)
     * @param signer Expected game signer address
     * @param nonce Unique nonce for replay protection
     * @param callData Encoded function call data
     * @param signature Signature bytes to verify
     * @return bool True if signature is valid and signer has GAME_SIGNER_ROLE
     */
    function _verifySignature(
        address target,
        address account,
        address signer,
        uint256 nonce,
        bytes memory callData,
        bytes memory signature
    )
        private
        view
        returns (bool)
    {
        bytes32 hash = _getMessageHash(target, account, signer, nonce, callData);
        (address actualSigner,,) = ECDSA.tryRecover(hash, signature);
        if (signer != actualSigner) {
            revert GameRegestry__NotSigner();
        }
        return hasRole(GAME_SIGNER_ROLE, actualSigner);
    }

    /**
     * @notice Generates EIP-712 typed data hash for commit signature verification
     * @dev Public function so game server can generate matching hashes (similar to Megapot pattern)
     * @param target Target token contract address
     * @param account Player account address
     * @param signer Game signer address
     * @param nonce Unique nonce
     * @param callData Encoded function call data
     * @return digest The EIP-712 compliant hash digest
     */
    function _getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData) private view returns (bytes32 digest) {
        bytes32 hashStruct =
            keccak256(abi.encode(MESSAGE_TYPEHASH, CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData})));
        return _hashTypedDataV4(hashStruct);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the list of all registered game coins
     * @return Array of coin names available in the game
     */
    function getGameCoinsList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.COIN];
    }

    /**
     * @notice Retrieves the list of all registered game resources
     * @return Array of resource names available in the game
     */
    function getResourcesList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.RESOURCE];
    }

    /**
     * @notice Retrieves the list of all registered game characters
     * @return Array of character type names available in the game
     */
    function getCharactersList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.CHARACTER];
    }

    /**
     * @notice Retrieves the list of all registered unique items
     * @return Array of unique item names available in the game
     */
    function getUniqueItemsList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.UNIQUE_ITEM];
    }

    /**
     * @notice Retrieves game element details by resource hash
     * @param resourceHash Keccak256 hash of the element name
     * @return GameElementStruct containing token address, token ID, and requirements
     */
    function getGameElement(bytes32 resourceHash) external view returns (GameElementStruct memory) {
        return s_resourceHashToGameElement[resourceHash];
    }

    /**
     * @notice Checks if a nonce has been used in a previous commit
     * @param nonce The nonce to check
     * @return bool True if nonce has been used, false otherwise
     */
    function getIsNonceUsed(uint256 nonce) external view returns (bool) {
        return s_usedNonces[nonce];
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with DEFAULT_ADMIN_ROLE. Required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @dev Internal helper to hash a string to bytes32
     * @param _str String to hash
     * @return bytes32 Keccak256 hash of the string
     */
    function _hashString(string memory _str) internal pure returns (bytes32) {
        return keccak256(bytes(_str));
    }

    /**
     * @notice Returns the maximum allowed batch length for commit operations
     * @return uint256 Maximum number of commits allowed in a single batch (100)
     */
    function getBatchMaxLength() external pure returns (uint256) {
        return BATCH_LENGTH_MAX;
    }
}

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// internal & private view & pure functions
// external & public view & pure functions

// CEI:
// Check
// Effect
// Interaction

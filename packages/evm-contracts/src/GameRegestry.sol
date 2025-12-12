// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {
    AccessControlDefaultAdminRulesUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Array} from "./libraries/Array.sol";

/**
 * Need to apply for CEI principles: Check, Effect, Interaction or PRE-PI-CHECK (Pre-post interaction check) principles:
 * Check, Effect, Interaction
 */

/**
 * @title Game Regestry
 * @author Alexander Scherbatyuk
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
contract GameRegestry is
    Initializable,
    AccessControlDefaultAdminRulesUpgradeable,
    EIP712Upgradeable,
    ReentrancyGuard,
    UUPSUpgradeable
{
    using Array for string[];

    /*//////////////////////////////////////////////////////////////
                               ERRORS
    //////////////////////////////////////////////////////////////*/

    error GameRegestry__AdminRoleRevokeNotAllowed();
    error GameRegestry__AdminRoleGrantNotAllowed();
    error GameRegestry__AdminRoleRenounceNotAllowed();
    error GameRegestry__OnlyGameSignerRole();
    error GameRegestry__OnlyGameSignerOrMarketRole();
    error GameRegestry__InvalidSignatureMessage();
    error GameRegestry__CommitFailed();
    error GameRegestry__InvalidTarget();
    error GameRegestry__InvalidPlayer();
    error GameRegestry__InvalidSigner();
    error GameRegestry__InvalidCommitData();
    error GameRegestry__InvalidResource();
    error GameRegestry__NonceAlreadyUsed();
    error GameRegestry__InvalidGameSigner();
    error GameRegestry__NotAllowedToCommit();
    error GameRegestry__BatchLengthZero();
    error GameRegestry__BatchLengthTooLong();
    error GameRegestry__InvalidNonce();
    error GameRegestry__GameElementExists();
    error GameRegestry__GameElementIndexOuntOfRange();
    error GameRegestry__AddressZero();
    error GameRegestry__GameElementNameIsEmpty();
    error GameRegestry__UnknownTargetAddress();
    error GameRegestry__NotSigner();
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

    /// @dev default uinified struct for any type of a game element
    struct GameElementStruct {
        address tokenAddress;
        uint256 tokenId;
        bool requiresTokenId; // if true, then tokenId is required to be added to the commit data
    } //

    struct CommitStruct {
        address target;
        address account;
        address signer;
        uint256 nonce;
        bytes callData;
    }

    /*//////////////////////////////////////////////////////////////
                               MAPPINGS
    //////////////////////////////////////////////////////////////*/

    /// @notice these arrays are informational, to provide list of available game elements to the game client / market
    /// @dev must be restricted for updating, only GAME_SIGNER_ROLE can add / remove game elements to the list
    mapping(GameElementType => string[]) private s_gameElementsByType; // game elements by type
    mapping(bytes32 => GameElementStruct) private s_resourceHashToGameElement; // client would call a specific function
    // to get GameElementStruct in order to build a commit data
    mapping(uint256 => bool) private s_usedNonces; // nonce is used to prevent replay attacks

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    bytes32 private constant MARKET_ROLE = keccak256("MARKET_ROLE"); // NOT sure anymore that is needed
    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 private constant MESSAGE_TYPEHASH =
        keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");
    uint256 private constant BATCH_LENGTH_MAX = 100; // max length of the commit batch
    //address private s_market; // use hasRole MARKET_ROLE to commit marketplace transactions
    //address private s_gameSigner; // use hasRole GAME_SIGNER_ROLE to verify signature of the message from a player

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event CommitResources(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(
        bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId
    );
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
     * @notice Constructor
     * @param _coins coins names that are available within the game
     * @param _resources resource names that are available within the game
     * @param _characters characters types that are available within the game
     * @param _uiniqueItems uinique items names that are available within the game
     * @param _gameSigner game signer address
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
     * @notice Commit batch of resources to the regestry
     * @param batch array of commit data
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
            (bytes32 resourceHash, bytes memory commit, bytes memory signature) =
                abi.decode(batch[i], (bytes32, bytes, bytes));
            _commitResource(resourceHash, commit, signature);

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Commit resources to the regestry
     * @param resourceHash hash of the resource
     * @param commit commit data
     * @param signature signature of the commit data
     * @dev q can we use FREI-PI CHECK (Pre-post interaction check) principles here?
     */
    function commitResource(bytes32 resourceHash, bytes memory commit, bytes memory signature) external nonReentrant {
        _commitResource(resourceHash, commit, signature);
    }

    /**
     * @notice Remove game element from the regestry
     * @param elementType type of the game element
     * @param index index of the game element
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
     * This contract regesters game elements on chain for further of-chain reference. Game server is going to use this
     * data for commits generation.
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
        s_resourceHashToGameElement[nameHash] = GameElementStruct({
            tokenAddress: elementTokenAddress, tokenId: elementTokenId, requiresTokenId: elementHasTokenId
        });

        emit AddGameElement(nameHash, elementTokenAddress, elementTokenId, elementHasTokenId);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Commit resource to the regestry
     * @param resourceHash hash of the resource
     * @param commit commit data
     * @param signature signature of the commit data
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
     * @notice Dispatcher for the commit data
     * @param target target address
     * @param callData call data
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

    /// TODO: identify core invariants and verify them after the commit
    function _verifyAfter() private {
        // Possible invariants to verify (not specificly to this contractm, but to the protocol):
        // - ERC20 tokens supply did not changed / or changed by the expected amount
        // - ERC721 tokens supply did not changed / or changed by the expected amount
        // - ERC1155 tokens supply did not changed / or changed by the expected amount
    }

    /// TODO: verify inputs of the commit data
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
     * @notice Verify signature of the commit data
     * @param target target address of the token contract
     * @param account account address of the player, owner of the resources
     * @param signer signer address game signer address
     * @param nonce nonce
     * @param callData call data
     * @param signature signature
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
     * @notice Get message hash
     * @param target target address
     * @param account account address
     * @param signer signer address
     * @param nonce nonce
     * @param callData call data
     */
    // q maybe make it public, for server to call -> mmegapot alike
    function _getMessageHash(
        address target,
        address account,
        address signer,
        uint256 nonce,
        bytes memory callData
    )
        public
        view
        returns (bytes32 digest)
    {
        bytes32 hashStruct = keccak256(
            abi.encode(
                MESSAGE_TYPEHASH,
                CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData})
            )
        );
        return _hashTypedDataV4(hashStruct);
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get game coins list
     * @return coins list
     */
    function getGameCoinsList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.COIN];
    }

    /**
     * @notice Get resources list
     * @return resources list
     */
    function getResourcesList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.RESOURCE];
    }

    /**
     * @notice Get characters list
     * @return characters list
     */
    function getCharactersList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.CHARACTER];
    }

    /**
     * @notice Get unique items list
     * @return unique items list
     */
    function getUniqueItemsList() external view returns (string[] memory) {
        return s_gameElementsByType[GameElementType.UNIQUE_ITEM];
    }

    /**
     * @notice Get game element struct
     * @param resourceHash hash of the resource
     * @return game element struct
     */
    function getGameElement(bytes32 resourceHash) external view returns (GameElementStruct memory) {
        return s_resourceHashToGameElement[resourceHash];
    }

    /**
     * @notice Check nonce used
     * @param nonce nonce
     * @return true if nonce is used, false otherwise
     */
    function getIsNonceUsed(uint256 nonce) external view returns (bool) {
        return s_usedNonces[nonce];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function _hashString(string memory _str) internal pure returns (bytes32) {
        return keccak256(bytes(_str));
    }

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

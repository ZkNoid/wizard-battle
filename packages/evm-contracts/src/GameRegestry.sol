// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Array} from "./libraries/Array.sol";

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
contract GameRegestry is Ownable, AccessControl, EIP712 { // Ownable, Controll Access (Owner access is limited to revoke / grant ADMIN_ROLE)
    using Array for string[];

    // Errors

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



    //Enums

    enum GameElementType {
        COIN,
        RESOURCE,
        CHARACTER,
        UNIQUE_ITEM
    }

    // Structs

    /// @dev default uinified struct for any type of a game element
    struct GameElementStruct {
        address tokenAddress;
        uint256 tokenId;
        bool requiresTokenId; // if true, then tokenId is required to be added to the commit data
    }

    struct CommitStruct {
         address target;
        address account;
        address signer;
        uint256 nonce;
        bytes callData;
    }

    // Arrays

    /// @notice these arrays are informational, to provide list of available game elements to the game client / market
    /// @dev must be restricted for updating, only GAME_SIGNER_ROLE can add / remove game elements to the list
    // string[] private s_coins; // coins names that are available within the game
    // string[] private s_resources; // resource names that are available within the game
    // string[] private s_characters; // characters types that are available within the game
    // string[] private s_uiniqueItems; // uinique items names that are available within the game

    // Mapping

    /// @notice these arrays are informational, to provide list of available game elements to the game client / market
    /// @dev must be restricted for updating, only GAME_SIGNER_ROLE can add / remove game elements to the list
    mapping(GameElementType => string[]) private s_gameElementsByType; // game elements by type

    mapping(bytes32 => GameElementStruct) private s_resourceToGameElement; // client would call a specific function to get GameElementStruct in order to build a commit data
    mapping(uint256 => bool) private s_usedNonces; // nonce is used to prevent replay attacks
   
    // Constants

    bytes32 private constant MARKET_ROLE = keccak256("MARKET_ROLE");
    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 private constant MESSAGE_TYPEHASH = keccak256("CommitStruct(address target,address account,address signer, uint256 nonce, bytes callData)");

    //address private s_market; // use hasRole MARKET_ROLE to commit marketplace transactions
    //address private s_gameSigner; // use hasRole GAME_SIGNER_ROLE to verify signature of the message from a player

    event GameRegestry__CommitResources(bytes indexed commit);
    event GameRegestry__RemoveGameElement(uint256 indexed index, GameElementType elementType);
    event GameRegestry__AddGameElement(string indexed name, GameElementType elementType);
    event GameRegestry__RevokeAdminRole(address indexed account);
    event GameRegestry__GrantAdminRole(address indexed account);
    event GameRegestry__CommitConfirmed(bytes indexed commit);
    event GameRegestry__CommitRejected(bytes indexed commit);
    event GameRegestry__AddGameElementStruct(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);
    

    // Modifiers

    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE
     */
    modifier onlyGameSignerRole() {
        if (!hasRole(GAME_SIGNER_ROLE, _msgSender())) {
            revert GameRegestry__OnlyGameSignerRole();
        }
        _;
    }

    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE or MARKET_ROLE
     */
    modifier onlyGameSignerOrMarketRole() {
        if (!hasRole(GAME_SIGNER_ROLE, _msgSender()) && !hasRole(MARKET_ROLE, _msgSender())) {
            revert GameRegestry__OnlyGameSignerOrMarketRole();
        }
        _;
    }

    // Functions

    /**
     * @notice Constructor
     * @param _coins coins names that are available within the game
     * @param _resources resource names that are available within the game
     * @param _characters characters types that are available within the game
     * @param _uiniqueItems uinique items names that are available within the game
     * @param _gameSigner game signer address
     */
    constructor(string[] memory _coins, string[] memory _resources, string[] memory _characters, string[] memory _uiniqueItems, address _gameSigner) Ownable(_msgSender()) EIP712("GameRegestry", "1") {
  
        s_gameElementsByType[GameElementType.COIN] = _coins;
        s_gameElementsByType[GameElementType.RESOURCE] = _resources;
        s_gameElementsByType[GameElementType.CHARACTER] = _characters;
        s_gameElementsByType[GameElementType.UNIQUE_ITEM] = _uiniqueItems;

        if (_gameSigner == address(0)) {
            revert GameRegestry__InvalidGameSigner();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(GAME_SIGNER_ROLE, _gameSigner);
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Commit resources to the regestry
     * @param resourceHash hash of the resource
     * @param commit commit data
     * @param signature signature of the commit data
     */
    function commitResources(bytes32 resourceHash, bytes calldata commit, bytes memory signature) external {
        if (resourceHash == bytes32(0) || commit.length == 0 || signature.length == 0) {
            revert GameRegestry__InvalidCommitData();
        }
        GameElementStruct memory gameElement = s_resourceToGameElement[resourceHash];
        (address target,address account, address signer, uint256 nonce, bytes memory callData) = abi.decode(commit,(address, address, address, uint256, bytes));

        if (s_usedNonces[nonce]) {
            revert GameRegestry__NonceAlreadyUsed();
        }
        if (gameElement.tokenAddress == address(0)) {
            revert GameRegestry__InvalidResource();
        }
        if (target == address(0)) {
            revert GameRegestry__InvalidTarget();
        }
        if (account == address(0)) {
            revert GameRegestry__InvalidPlayer();
        }
        if (!hasRole(GAME_SIGNER_ROLE, signer)) {
            revert GameRegestry__InvalidSigner();
        }
        if (!_verifySignature(target, account, signer, nonce, callData, signature)) {
            revert GameRegestry__InvalidSignatureMessage();
        }
        emit GameRegestry__CommitResources(commit);
        s_usedNonces[nonce] = true;
        _commitDispatcher(target, callData);
    }

    /**
     * @notice Revoke admin role from an account
     * @param account account to revoke admin role from
     */
    function revokeAdminRole(address account) external onlyOwner {
        _revokeRole(DEFAULT_ADMIN_ROLE, account);
        emit GameRegestry__RevokeAdminRole(account);
    }

    /**
     * @notice Grant admin role to an account
     * @param account account to grant admin role to
     */
    function grantAdminRole(address account) external onlyOwner {
        _grantRole(DEFAULT_ADMIN_ROLE, account);
        emit GameRegestry__GrantAdminRole(account);
    }

    /**
     * @notice Add game element to the regestry
     * @param elementType type of the game element
     * @param name name of the game element
     */
    function addGameElement(GameElementType elementType, string memory name) external onlyGameSignerRole {
        s_gameElementsByType[elementType].push(name);
        // if (elementType == GameElementType.COIN) {
        //     s_coins.push(name);
        // } else if (elementType == GameElementType.RESOURCE) {
        //     s_resources.push(name);
        // } else if (elementType == GameElementType.CHARACTER) {
        //     s_characters.push(name);
        // } else if (elementType == GameElementType.UNIQUE_ITEM) {
        //     s_uiniqueItems.push(name);
        // }
        emit GameRegestry__AddGameElement(name, elementType);
    }

    /**
     * @notice Remove game element from the regestry
     * @param elementType type of the game element
     * @param index index of the game element
     */
    function removeGameElement(GameElementType elementType, uint256 index) external onlyGameSignerRole {
        // if (elementType == GameElementType.COIN) {
        //     s_coins.removeByIndex(index);
        // } else if (elementType == GameElementType.RESOURCE) {
        //     s_resources.removeByIndex(index);
        // } else if (elementType == GameElementType.CHARACTER) {
        //     s_characters.removeByIndex(index);
        // } else if (elementType == GameElementType.UNIQUE_ITEM) {
        //     s_uiniqueItems.removeByIndex(index);
        // }
        s_gameElementsByType[elementType].removeByIndex(index);
        emit GameRegestry__RemoveGameElement(index, elementType);
    }


    /**
     * @notice Add game element struct to the regestry
     * @param nameHash hash of the game element name
     * @param tokenAddress address of the token
     * @param tokenId token id
     * @param requiresTokenId if true, then tokenId is required to be added to the commit data
     */
    function addGameElementStruct(bytes32 nameHash, address tokenAddress, uint256 tokenId, bool requiresTokenId) external onlyGameSignerRole {
        s_resourceToGameElement[nameHash] = GameElementStruct({
            tokenAddress: tokenAddress,
            tokenId: tokenId,
            requiresTokenId: requiresTokenId
        });
        emit GameRegestry__AddGameElementStruct(nameHash, tokenAddress, tokenId, requiresTokenId);
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Renounces a role from the calling account, allows everyone to renounce their own role except for DEFAULT_ADMIN_ROLE.
     * @param role role to renounce
     * @param callerConfirmation caller confirmation address
     */
    function renounceRole(bytes32 role, address callerConfirmation) public override {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert GameRegestry__AdminRoleRenounceNotAllowed();
        }
        super.renounceRole(role, callerConfirmation);
    }

    /**
     * @notice Grant role to an account
     * @param role role to grant
     * @param account account to grant role to
     */
    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert GameRegestry__AdminRoleGrantNotAllowed();
        }
        super.grantRole(role, account);
    }

    /**
     * @notice Revoke role from an account
     * @param role role to revoke
     * @param account account to revoke role from
     * @dev revoke role only if it is not DEFAULT_ADMIN_ROLE
     */
    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert GameRegestry__AdminRoleRevokeNotAllowed();
        }
        super.revokeRole(role, account);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Dispatcher for the commit data
     * @param target target address
     * @param callData call data
     */
    function _commitDispatcher(address target, bytes memory callData) private {
        if (target == address(0)) {
            revert GameRegestry__InvalidTarget();
        }
        (bool success, ) = target.call(callData);
        if (!success) {
            revert GameRegestry__CommitFailed();
        }
        emit GameRegestry__CommitConfirmed(callData);
    }


    /*//////////////////////////////////////////////////////////////
                         PRIVATE VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Verify signature of the commit data
     * @param target target address
     * @param account account address
     * @param signer signer address
     * @param nonce nonce
     * @param callData call data
     * @param signature signature
     */
    function _verifySignature(address target, address account, address signer, uint256 nonce, bytes memory callData, bytes memory signature) private view returns(bool) {
        bytes32 hash = _getMessageHash(target, account, signer, nonce, callData);
        (address actualSignature,,) = ECDSA.tryRecover(hash, signature);
        return hasRole(GAME_SIGNER_ROLE, actualSignature);
    }

    /**
     * @notice Get message hash
     * @param target target address
     * @param account account address
     * @param signer signer address
     * @param nonce nonce
     * @param callData call data
     */
    function _getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData) private view returns (bytes32 digest) {
        bytes32 hashStruct = keccak256(abi.encode(MESSAGE_TYPEHASH, CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData})));
        return _hashTypedDataV4(hashStruct);
    }


    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get game coins list
     * @return coins list
     */
    function getGameCoinsList() external view returns(string[] memory) {
        return s_gameElementsByType[GameElementType.COIN];
    }

    /**
     * @notice Get resources list
     * @return resources list
     */
    function getResourcesList() external view returns(string[] memory) {
        return s_gameElementsByType[GameElementType.RESOURCE];
    }

    /**
     * @notice Get characters list
     * @return characters list
     */
    function getCharactersList() external view returns(string[] memory) {
        return s_gameElementsByType[GameElementType.CHARACTER];
    }
    
    /**
     * @notice Get unique items list
     * @return unique items list
     */
    function getUniqueItemsList() external view returns(string[] memory) {
        return s_gameElementsByType[GameElementType.UNIQUE_ITEM];
    }


    /**
     * @notice Get game element struct
     * @param resourceHash hash of the resource
     * @return game element struct
     */
    function getGameElement(bytes32 resourceHash) external view returns(GameElementStruct memory) {
        return s_resourceToGameElement[resourceHash];
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
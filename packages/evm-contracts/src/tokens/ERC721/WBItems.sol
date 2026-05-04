// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.30;

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title WBItems
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Items - An upgradeable ERC721 NFT contract for game items
 * @dev This contract implements an ERC721 token with the following features:
 * - Upgradeable using UUPS proxy pattern
 * - Enumerable NFTs for easy iteration and discovery
 * - Pausable transfers for emergency situations
 * - Burnable tokens
 * - Role-based access control
 * - Minting capability restricted to MINTER_ROLE
 * - Pause/unpause capability restricted to PAUSER_ROLE
 * - Upgrade capability restricted to UPGRADER_ROLE
 * - ERC7201 namespaced storage pattern for upgrade safety
 */
contract WBItems is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721PausableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable,
    AccessControlUpgradeable
{
    using Strings for uint256;

    /**
     * @dev Storage structure for WBItems contract state
     * @custom:storage-location erc7201:myProject.MyToken
     */
    struct WBItemsStorage {
        /// @dev Counter for the next token ID to be minted
        uint256 _nextTokenId;
        string _uri;
    }

    /// @dev Storage slot location for WBItemsStorage (ERC7201 pattern)
    /// @dev keccak256(abi.encode(uint256(keccak256("myProject.MyToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant WB_CHARACTER_STORAGE_LOCATION = 0xfbb7c9e4123fcf4b1aad53c70358f7b1c1d7cf28092f5178b53e55db565e9200;

    /// @notice Role identifier for addresses that can pause/unpause the token
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role identifier for addresses that can mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role identifier for addresses that can upgrade the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the WBItems contract
     * @dev This function can only be called once due to the initializer modifier
     * @param defaultAdmin Address to be granted the default admin role
     * @param pauser Address to be granted the PAUSER_ROLE
     * @param minter Address to be granted the MINTER_ROLE
     * @param upgrader Address to be granted the UPGRADER_ROLE
     */
    function initialize(address defaultAdmin, address pauser, address minter, address upgrader) public initializer {
        __ERC721_init("WBItems", "WBCH");
        __ERC721Enumerable_init();
        __ERC721Pausable_init();
        __ERC721Burnable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Pauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Mints a new item NFT to a specified address
     * @dev Can only be called by addresses with MINTER_ROLE. Token ID is auto-incremented
     * @param to Address to receive the minted item NFT
     * @return uint256 The ID of the newly minted token
     */
    function mint(address to) external onlyRole(MINTER_ROLE) returns (uint256) {
        WBItemsStorage storage $ = _getWBItemsStorage();
        uint256 tokenId = $._nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Sets the base URI for token metadata
     * @dev Can only be called by addresses with DEFAULT_ADMIN_ROLE
     * @param uri The new base URI string
     */
    function setURI(string memory uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        WBItemsStorage storage $ = _getWBItemsStorage();
        $._uri = uri;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with UPGRADER_ROLE. This is required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // The following functions are overrides required by Solidity.

    /**
     * @dev Internal function to update token ownership, respecting pause state and enumeration
     * @param to Address receiving the token (zero address for burns)
     * @param tokenId ID of the token being transferred
     * @param auth Address authorized to perform the update
     * @return address The previous owner of the token
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Internal function to increase the balance of an account
     * @param account Address whose balance is being increased
     * @param value Amount to increase the balance by
     */
    function _increaseBalance(address account, uint128 value) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._increaseBalance(account, value);
    }

    /*//////////////////////////////////////////////////////////////
                     INTERNAL VIEW / PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Retrieves the storage struct using ERC7201 namespaced storage pattern
     * @return $ Storage reference to WBItemsStorage struct
     */
    function _getWBItemsStorage() internal pure returns (WBItemsStorage storage $) {
        assembly {
            $.slot := WB_CHARACTER_STORAGE_LOCATION
        }
    }

    /**
     * @dev Returns the base URI for computing tokenURI
     * @return string The base URI string (currently empty, should be configured for production)
     * @dev TODO: Decide need to override or not
     */
    function _baseURI() internal view override returns (string memory) {
        WBItemsStorage storage $ = _getWBItemsStorage();
        return $._uri;
    }

    /**
     * @dev Overrides authorization check to allow MINTER_ROLE to transfer tokens without explicit approval
     * @param owner Current owner of the token
     * @param spender Address attempting to transfer the token
     * @param tokenId ID of the token being transferred
     */
    function _checkAuthorized(address owner, address spender, uint256 tokenId) internal view override(ERC721Upgradeable) {
        if (!_isAuthorized(owner, spender, tokenId)) {
            if (owner == address(0)) {
                revert ERC721NonexistentToken(tokenId);
            } else if (!hasRole(MINTER_ROLE, spender)) {
                revert ERC721InsufficientApproval(spender, tokenId);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                         EXTERNAL / PUBLIC VIEW
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the next token ID that will be assigned on mint
     * @return uint256 The next token ID
     */
    function getNextTokenId() external view returns (uint256) {
        WBItemsStorage memory $ = _getWBItemsStorage();
        return $._nextTokenId;
    }

    /**
     * @notice Returns the URI for a given token ID
     * @dev Returns the metadata URI for the specified character NFT
     * @param tokenId ID of the token to query
     * @return string The URI pointing to the token's metadata
     */
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable) returns (string memory) {
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string.concat(baseURI, tokenId.toString()) : "";
    }

    /**
     * @notice Checks if this contract implements a given interface
     * @param interfaceId Interface identifier to check
     * @return bool Returns true if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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

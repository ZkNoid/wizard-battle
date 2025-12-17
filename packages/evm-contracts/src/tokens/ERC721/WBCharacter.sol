// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title WBCharacter
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Character - An upgradeable ERC721 NFT contract for game characters
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
contract WBCharacter is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    /**
     * @dev Storage structure for WBCharacter contract state
     * @custom:storage-location erc7201:myProject.MyToken
     */
    struct WBCharacterStorage {
        /// @dev Counter for the next token ID to be minted
        uint256 _nextTokenId;
    }

    /// @dev Storage slot location for WBCharacterStorage (ERC7201 pattern)
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
     * @notice Initializes the WBCharacter contract
     * @dev This function can only be called once due to the initializer modifier
     * @param defaultAdmin Address to be granted the default admin role
     * @param pauser Address to be granted the PAUSER_ROLE
     * @param minter Address to be granted the MINTER_ROLE
     * @param upgrader Address to be granted the UPGRADER_ROLE
     */
    function initialize(address defaultAdmin, address pauser, address minter, address upgrader) public initializer {
        __ERC721_init("WBCharacter", "WBCH");
        __ERC721Enumerable_init();
        __ERC721Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);
    }

    /**
     * @notice Pauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Mints a new character NFT to a specified address
     * @dev Can only be called by addresses with MINTER_ROLE. Token ID is auto-incremented
     * @param to Address to receive the minted character NFT
     * @return uint256 The ID of the newly minted token
     */
    function mint(address to) public onlyRole(MINTER_ROLE) returns (uint256) {
        WBCharacterStorage storage $ = _getWBCharacterStorage();
        uint256 tokenId = $._nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    /**
     * @dev Retrieves the storage struct using ERC7201 namespaced storage pattern
     * @return $ Storage reference to WBCharacterStorage struct
     */
    function _getWBCharacterStorage() private pure returns (WBCharacterStorage storage $) {
        assembly {
            $.slot := WB_CHARACTER_STORAGE_LOCATION
        }
    }

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

    /**
     * @notice Returns the URI for a given token ID
     * @dev Returns the metadata URI for the specified character NFT
     * @param tokenId ID of the token to query
     * @return string The URI pointing to the token's metadata
     */
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
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

    /**
     * @dev Returns the base URI for computing tokenURI
     * @return string The base URI string (currently empty, should be configured for production)
     * @dev TODO: Decide need to override or not
     */
    function _baseURI() internal pure override returns (string memory) {
        return "";
    }
}

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
// integraded, not implemented
import {ERC1155PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title WBResources
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Resources - An upgradeable ERC1155 multi-token contract for game resources
 * @dev This contract implements an ERC1155 token with the following features:
 * - Upgradeable using UUPS proxy pattern
 * - Multi-token standard allowing multiple fungible and non-fungible tokens
 * - Supply tracking for each token ID
 * - Pausable transfers for emergency situations
 * - Burnable tokens
 * - Role-based access control
 * - URI setter capability for metadata management
 * - Minting capability restricted to MINTER_ROLE
 * - Pause/unpause capability restricted to PAUSER_ROLE
 * - Upgrade capability restricted to UPGRADER_ROLE
 */
contract WBResources is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ERC1155PausableUpgradeable,
    /* ERC1155BurnableUpgradeable,*/
    ERC1155SupplyUpgradeable,
    UUPSUpgradeable
{
    /// @notice Role identifier for addresses that can set token URIs
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

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
     * @notice Initializes the WBResources contract
     * @dev This function can only be called once due to the initializer modifier.
     *      Mints token ID 0 to the contract itself as a reserved ID.
     * @param defaultAdmin Address to be granted the default admin role
     * @param pauser Address to be granted the PAUSER_ROLE
     * @param minter Address to be granted the MINTER_ROLE
     * @param upgrader Address to be granted the UPGRADER_ROLE
     */
    function initialize(address defaultAdmin, address pauser, address minter, address upgrader) public initializer {
        __ERC1155_init("");
        __AccessControl_init();
        __ERC1155Pausable_init();
        __ERC1155Supply_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);

        _mint(address(this), 0, 1, ""); // reserver id 0 by owner
    }

    /**
     * @notice Pauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     * @dev TODO: Verify URI should return a JSON according to ERC1155 metadata specs
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Returns the URI for a given token ID
     * @dev Returns the metadata URI for the specified resource token
     * @param tokenId ID of the token to query
     * @return string The URI pointing to the token's metadata (should be JSON per ERC1155 spec)
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return super.uri(tokenId);
    }

    /**
     * @notice Unpauses all token transfers
     * @dev Can only be called by addresses with PAUSER_ROLE
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Mints tokens of a specific ID to an address
     * @dev Can only be called by addresses with MINTER_ROLE
     * @param account Address to receive the minted tokens
     * @param id Token ID to mint
     * @param amount Amount of tokens to mint
     * @param data Additional data to pass to the receiver (if it's a contract)
     */
    function mint(address account, uint256 id, uint256 amount, bytes memory data) public onlyRole(MINTER_ROLE) {
        _mint(account, id, amount, data);
    }

    /**
     * @notice Burns tokens of a specific ID from an address
     * @dev Can only be called by addresses with MINTER_ROLE
     * @param account Address from which the tokens will be burned
     * @param id Token ID to burn
     * @param value Amount of tokens to burn
     */
    function burn(address account, uint256 id, uint256 value) public {
        if (account != _msgSender() && !isApprovedForAll(account, _msgSender()) && !hasRole(MINTER_ROLE, _msgSender())) {
            revert ERC1155MissingApprovalForAll(_msgSender(), account);
        }
        _burn(account, id, value);
    }

    /**
     * @notice Mints multiple token types in a single transaction
     * @dev Can only be called by addresses with MINTER_ROLE. Arrays must have equal length
     * @param to Address to receive the minted tokens
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param data Additional data to pass to the receiver (if it's a contract)
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, data);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory values) public {
        if (account != _msgSender() && !isApprovedForAll(account, _msgSender()) && !hasRole(MINTER_ROLE, _msgSender())) {
            revert ERC1155MissingApprovalForAll(_msgSender(), account);
        }
        _burnBatch(account, ids, values);
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with UPGRADER_ROLE. This is required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // The following functions are overrides required by Solidity.

    /**
     * @dev Internal function to update token balances, respecting pause state and supply tracking
     * @param from Address tokens are transferred from (zero address for minting)
     * @param to Address tokens are transferred to (zero address for burning)
     * @param ids Array of token IDs being transferred
     * @param values Array of amounts being transferred for each token ID
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    )
        internal
        override(ERC1155Upgradeable, ERC1155PausableUpgradeable, ERC1155SupplyUpgradeable)
    {
        super._update(from, to, ids, values);
    }

    /**
     * @notice Checks if this contract implements a given interface
     * @param interfaceId Interface identifier to check
     * @return bool Returns true if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return ERC1155Upgradeable.supportsInterface(interfaceId) || AccessControlUpgradeable.supportsInterface(interfaceId);
    }
}

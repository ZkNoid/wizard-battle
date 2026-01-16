// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title WBCoin
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Coin - An upgradeable ERC20 token for the Wizard Battle game
 * @dev This contract implements an ERC20 token with the following features:
 * - Upgradeable using UUPS proxy pattern
 * - Pausable transfers
 * - Burnable tokens
 * - Role-based access control with enumeration
 * - Minting capability restricted to MINTER_ROLE
 * - Pause/unpause capability restricted to PAUSER_ROLE
 * - Upgrade capability restricted to UPGRADER_ROLE
 */
contract WBCoin is
    Initializable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    AccessControlDefaultAdminRulesUpgradeable,
    UUPSUpgradeable
{
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
     * @notice Initializes the WBCoin contract
     * @dev This function can only be called once due to the initializer modifier
     * @param defaultAdmin Address to be granted the default admin role
     * @param pauser Address to be granted the PAUSER_ROLE
     * @param minter Address to be granted the MINTER_ROLE
     * @param upgrader Address to be granted the UPGRADER_ROLE
     */
    function initialize(address defaultAdmin, address pauser, address minter, address upgrader) public initializer {
        __ERC20_init("WBCoin", "WBC");
        __ERC20Pausable_init();
        __AccessControlDefaultAdminRules_init(0, defaultAdmin);
        __AccessControlEnumerable_init();

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
     * @notice Mints new tokens to a specified address
     * @dev Can only be called by addresses with MINTER_ROLE
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _burn(account, amount);
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with UPGRADER_ROLE. This is required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // The following functions are overrides required by Solidity.

    /**
     * @dev Internal function to update token balances, respecting pause state
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param value Amount of tokens to transfer
     */
    function _update(address from, address to, uint256 value) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._update(from, to, value);
    }

    /**
     * @dev Internal function to grant a role to an account
     * @param role Role identifier to grant
     * @param account Address to grant the role to
     * @return bool Returns true if the role was granted
     */
    function _grantRole(
        bytes32 role,
        address account
    )
        internal
        virtual
        override(AccessControlEnumerableUpgradeable, AccessControlDefaultAdminRulesUpgradeable)
        returns (bool)
    {
        return AccessControlDefaultAdminRulesUpgradeable._grantRole(role, account);
    }

    /**
     * @dev Internal function to revoke a role from an account
     * @param role Role identifier to revoke
     * @param account Address to revoke the role from
     * @return bool Returns true if the role was revoked
     */
    function _revokeRole(
        bytes32 role,
        address account
    )
        internal
        virtual
        override(AccessControlEnumerableUpgradeable, AccessControlDefaultAdminRulesUpgradeable)
        returns (bool)
    {
        return AccessControlDefaultAdminRulesUpgradeable._revokeRole(role, account);
    }

    /**
     * @dev Internal function to set the admin role for a given role
     * @param role Role identifier to set admin for
     * @param adminRole Admin role identifier
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual override(AccessControlUpgradeable, AccessControlDefaultAdminRulesUpgradeable) {
        AccessControlDefaultAdminRulesUpgradeable._setRoleAdmin(role, adminRole);
    }

    /**
     * @notice Grants a role to an account
     * @dev Can only be called by the role's admin
     * @param role Role identifier to grant
     * @param account Address to grant the role to
     */
    function grantRole(
        bytes32 role,
        address account
    )
        public
        virtual
        override(AccessControlUpgradeable, IAccessControl, AccessControlDefaultAdminRulesUpgradeable)
    {
        AccessControlDefaultAdminRulesUpgradeable.grantRole(role, account);
    }

    /**
     * @notice Revokes a role from an account
     * @dev Can only be called by the role's admin
     * @param role Role identifier to revoke
     * @param account Address to revoke the role from
     */
    function revokeRole(
        bytes32 role,
        address account
    )
        public
        virtual
        override(AccessControlUpgradeable, IAccessControl, AccessControlDefaultAdminRulesUpgradeable)
    {
        AccessControlDefaultAdminRulesUpgradeable.revokeRole(role, account);
    }

    /**
     * @notice Allows an account to renounce a role they have
     * @dev Can only be called by the account itself
     * @param role Role identifier to renounce
     * @param account Address renouncing the role (must be msg.sender)
     */
    function renounceRole(
        bytes32 role,
        address account
    )
        public
        virtual
        override(AccessControlUpgradeable, IAccessControl, AccessControlDefaultAdminRulesUpgradeable)
    {
        AccessControlDefaultAdminRulesUpgradeable.renounceRole(role, account);
    }

    /**
     * @notice Checks if this contract implements a given interface
     * @param interfaceId Interface identifier to check
     * @return bool Returns true if the contract implements the interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerableUpgradeable, AccessControlDefaultAdminRulesUpgradeable)
        returns (bool)
    {
        return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) || AccessControlDefaultAdminRulesUpgradeable.supportsInterface(interfaceId);
    }
}

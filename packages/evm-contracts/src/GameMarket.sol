// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";

/**
 * @title GameMarket
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Game Market - An upgradeable marketplace contract for trading game assets
 * @dev This contract implements a marketplace with the following features:
 * - Upgradeable using UUPS proxy pattern
 * - Access control with default admin rules and time-delayed admin transfers
 * - Default admin role with 1-day delay for admin role transfers
 * - Upgrade capability restricted to DEFAULT_ADMIN_ROLE
 * @dev This is a foundational contract that can be extended with marketplace functionality
 */
contract GameMarket is Initializable, UUPSUpgradeable, AccessControlDefaultAdminRulesUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the GameMarket contract
     * @dev Sets up access control with a 1-day delay for admin role transfers.
     *      The deployer (msg.sender) becomes the default admin.
     *      This function can only be called once due to the initializer modifier.
     */
    function initialize() external initializer {
        __AccessControlDefaultAdminRules_init(1 days, msg.sender);
    }

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with DEFAULT_ADMIN_ROLE. This is required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

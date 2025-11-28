// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// q who can mint and burn tokens:
// - q can a admin mint and burn tokens? - yes
// - q can a game signer mint and burn tokens? - ?
// - q can a game instance mint and burn tokens? - ?
// - q can a marketplace mint and burn tokens? - no
// - q can a player mint and burn tokens? - no
// - q can a player mint and burn tokens? - no

import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract WBCoin is Initializable, AccessControlDefaultAdminRulesUpgradeable, ERC20Upgradeable, UUPSUpgradeable {
    // Errors
    error WBCoin__OnlyGameSignerRole();
    error WBCoin__OnlyGameSignerOrMarketRole();
    error WBCoin__AdminRoleRenounceNotAllowed();
    error WBCoin__AdminRoleGrantNotAllowed();
    error WBCoin__AdminRoleRevokeNotAllowed();
    error WBCoin__OnlyAdminOrGameRegestryRole();

    // State variables
    // bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 private constant GAME_REGISTRY_ROLE = keccak256("GAME_REGISTRY_ROLE");


    // Events
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);


    // Modifiers
    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE
     * q can a game signer mint and burn tokens, meaning that a game instance does it derectly without using the game regestry contract?
     */
    modifier onlyAdminOrGameRegestryRole() {
        // Check: msg.sender must have DEFAULT_ADMIN_ROLE or GAME_REGISTRY_ROLE
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && !hasRole(GAME_REGISTRY_ROLE, msg.sender)) {
            revert WBCoin__OnlyAdminOrGameRegestryRole();
        }

        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function initialize(string memory name, string memory symbol) external initializer {
        __ERC20_init(name, symbol);
        __AccessControlDefaultAdminRules_init(1 days, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Mint tokens to an account
     * @param to address to mint tokens to
     * @param amount amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyAdminOrGameRegestryRole {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from an account
     * @param from address to burn tokens from
     * @param amount amount of tokens to burn
     */
    function burn(address from, uint256 amount) public onlyAdminOrGameRegestryRole {
        _burn(from, amount);
    }
     
   
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
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
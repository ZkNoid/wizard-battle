// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract WBCoin is Ownable, AccessControl, ERC20 {
    using SafeERC20 for IERC20; // to use safe transfer and safe transfer from
    // Errors

    error WBCoin__OnlyGameSignerRole();
    error WBCoin__OnlyGameSignerOrMarketRole();
    error WBCoin__AdminRoleRenounceNotAllowed();
    error WBCoin__AdminRoleGrantNotAllowed();
    error WBCoin__AdminRoleRevokeNotAllowed();

    bytes32 private constant MARKET_ROLE = keccak256("MARKET_ROLE");
    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 private constant GAME_REGISTRY_ROLE = keccak256("GAME_REGISTRY_ROLE");


    // Modifiers

    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE
     */
    modifier onlyGameSignerRole() {
        // Check 1: msg.sender must have GAME_REGISTRY_ROLE or GAME_SIGNER_ROLE
        if (!hasRole(GAME_REGISTRY_ROLE, msg.sender) && !hasRole(GAME_SIGNER_ROLE, msg.sender)) {
            revert WBCoin__OnlyGameSignerRole();
        }

        // Check 2: If msg.sender has GAME_REGISTRY_ROLE, then tx.origin must have GAME_SIGNER_ROLE
        if (hasRole(GAME_REGISTRY_ROLE, msg.sender)) {
            if (!hasRole(GAME_SIGNER_ROLE, tx.origin)) {
                revert WBCoin__OnlyGameSignerRole();
            }
        }

        _;
    }

    /**
     * @notice Modifier to check if the caller has the GAME_SIGNER_ROLE or MARKET_ROLE
     * @dev check if the caller has the GAME_SIGNER_ROLE or MARKET_ROLE from the transaction origin or message sender
     * @dev tx.origin supposed to be game client or marketplace, sended through the game regestry contract or directly
     */
    modifier onlyGameSignerOrMarketRole() {
        // Check 1: msg.sender must have GAME_REGISTRY_ROLE or GAME_SIGNER_ROLE or MARKET_ROLE
        if (!hasRole(GAME_REGISTRY_ROLE, msg.sender) && !hasRole(GAME_SIGNER_ROLE, msg.sender) && !hasRole(MARKET_ROLE, msg.sender)) {
            revert WBCoin__OnlyGameSignerOrMarketRole();
        }

        // Check 2: If msg.sender has GAME_REGISTRY_ROLE, then tx.origin must have GAME_SIGNER_ROLE or MARKET_ROLE
        if (hasRole(GAME_REGISTRY_ROLE, msg.sender)) {
            if (!hasRole(GAME_SIGNER_ROLE, tx.origin) && !hasRole(MARKET_ROLE, tx.origin)) {
                revert WBCoin__OnlyGameSignerOrMarketRole();
            }
        }

        _;
    }

    constructor(string memory name, string memory symbol, address initialOwner) Ownable(initialOwner) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


     /**
     * @notice Renounces a role from the calling account, allows everyone to renounce their own role except for DEFAULT_ADMIN_ROLE.
     * @param role role to renounce
     * @param callerConfirmation caller confirmation address
     */
    function renounceRole(bytes32 role, address callerConfirmation) public override {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert WBCoin__AdminRoleRenounceNotAllowed();
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
            revert WBCoin__AdminRoleGrantNotAllowed();
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
            revert WBCoin__AdminRoleRevokeNotAllowed();
        }
        super.revokeRole(role, account);
    }

    
}
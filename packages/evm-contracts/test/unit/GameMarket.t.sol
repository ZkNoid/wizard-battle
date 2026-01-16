// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameMarket} from "src/GameMarket.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract GameMarketTest is Test {
    GameMarket public gameMarket;
    GameMarket public implementation;

    address public ADMIN;
    address public USER;

    function setUp() public {
        ADMIN = makeAddr("ADMIN");
        USER = makeAddr("USER");

        // Deploy implementation
        implementation = new GameMarket();

        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(GameMarket.initialize.selector);
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        gameMarket = GameMarket(address(proxy));
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Initialization() public view {
        // Check that the contract has been initialized
        assertTrue(gameMarket.hasRole(gameMarket.DEFAULT_ADMIN_ROLE(), address(this)));
    }

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        gameMarket.initialize();
    }

    function test_ImplementationIsDisabled() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize();
    }

    /*//////////////////////////////////////////////////////////////
                            UPGRADE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeByAdmin() public {
        // Deploy new implementation
        GameMarket newImplementation = new GameMarket();

        // Upgrade to new implementation
        gameMarket.upgradeToAndCall(address(newImplementation), "");

        // Verify upgrade (still has admin role)
        assertTrue(gameMarket.hasRole(gameMarket.DEFAULT_ADMIN_ROLE(), address(this)));
    }

    function test_UpgradeRevertsIfNotAdmin() public {
        // Deploy new implementation
        GameMarket newImplementation = new GameMarket();

        // Try to upgrade from non-admin account
        vm.prank(USER);
        vm.expectRevert();
        gameMarket.upgradeToAndCall(address(newImplementation), "");
    }

    /*//////////////////////////////////////////////////////////////
                            ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AdminHasDefaultAdminRole() public view {
        assertTrue(gameMarket.hasRole(gameMarket.DEFAULT_ADMIN_ROLE(), address(this)));
    }

    function test_GrantAndRevokeRole() public {
        bytes32 testRole = keccak256("TEST_ROLE");

        // Grant role
        gameMarket.grantRole(testRole, USER);
        assertTrue(gameMarket.hasRole(testRole, USER));

        // Revoke role
        gameMarket.revokeRole(testRole, USER);
        assertFalse(gameMarket.hasRole(testRole, USER));
    }

    function test_NonAdminCannotGrantRoles() public {
        bytes32 testRole = keccak256("TEST_ROLE");

        vm.prank(USER);
        vm.expectRevert();
        gameMarket.grantRole(testRole, USER);
    }
}

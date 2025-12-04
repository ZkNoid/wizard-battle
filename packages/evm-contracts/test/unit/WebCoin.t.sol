// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console2} from "forge-std/Test.sol";
import {WBCoin} from "../../src/tokens/ERC20/WBCoin.sol";
import {DeployWBCoin} from "../../script/DeployWbCoin.s.sol";
import {WBCoinV2Mock} from "../mocks/WBCoinV2Mock.sol"; // We'll create this mock below
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WBCoinTest is Test {
    WBCoin public wbCoin;
    address public proxy;

    address public admin;
    address public pauser;
    address public minter = makeAddr("minter");
    address public upgrader = makeAddr("upgrader");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public attacker = makeAddr("attacker");

    uint256 public constant INITIAL_SUPPLY = 0; // Starts at 0
    uint256 public constant MINT_AMOUNT = 1000 ether;

    function setUp() public {
        DeployWBCoin deployer = new DeployWBCoin();
        proxy = deployer.deploy(); // This calls initialize with roles
        wbCoin = WBCoin(proxy);

        admin = address(this);
        pauser = address(this);
        minter = address(this);
        upgrader = address(this);
    }

    function test_DeployDeploy() public {
      DeployWBCoin deployer = new DeployWBCoin();
      address deploy = deployer.deploy();
      assertNotEq(deploy, address(0));
    }


    function test_DeployRun() public {
      DeployWBCoin deployer = new DeployWBCoin();
      address run = deployer.run();
      assertNotEq(run, address(0));
    }


    function test_Initialization() public view {
        assertEq(wbCoin.name(), "WBCoin");
        assertEq(wbCoin.symbol(), "WBC");
        assertEq(wbCoin.decimals(), 18);
        assertEq(wbCoin.totalSupply(), 0);

        assertTrue(wbCoin.hasRole(wbCoin.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(wbCoin.hasRole(wbCoin.PAUSER_ROLE(), pauser));
        assertTrue(wbCoin.hasRole(wbCoin.MINTER_ROLE(), minter));
        assertTrue(wbCoin.hasRole(wbCoin.UPGRADER_ROLE(), upgrader));
    }

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbCoin.initialize(admin, pauser, minter, upgrader);
    }

    function test_MintByMinter() public {
        vm.prank(minter);
        wbCoin.mint(user1, MINT_AMOUNT);

        assertEq(wbCoin.balanceOf(user1), MINT_AMOUNT);
        assertEq(wbCoin.totalSupply(), MINT_AMOUNT);
    }

    function test_MintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCoin.MINTER_ROLE()
            )
        );
        wbCoin.mint(user1, MINT_AMOUNT);
        vm.stopPrank();
    }

    function test_Burn() public {
        vm.startPrank(admin);
        wbCoin.mint(user1, MINT_AMOUNT);
        vm.stopPrank();

        vm.prank(user1);
        wbCoin.burn(MINT_AMOUNT / 2);

        assertEq(wbCoin.balanceOf(user1), MINT_AMOUNT / 2);
        assertEq(wbCoin.totalSupply(), MINT_AMOUNT / 2);
    }

    function test_PauseByPauser() public {
        vm.prank(pauser);
        wbCoin.pause();

        assertTrue(wbCoin.paused());
    }

    function test_UnpauseByPauser() public {
        vm.prank(pauser);
        wbCoin.pause();

        vm.prank(pauser);
        wbCoin.unpause();

        assertFalse(wbCoin.paused());
    }

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCoin.PAUSER_ROLE()
            )
        );
        wbCoin.pause();
        vm.stopPrank();
    }

    function test_TransfersBlockedWhenPaused() public {
        // Mint first
        vm.prank(minter);
        wbCoin.mint(user1, MINT_AMOUNT);

        // Pause
        vm.prank(pauser);
        wbCoin.pause();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        wbCoin.transfer(user2, 100 ether);
    }

    function test_TransfersAllowedWhenUnpaused() public {
        vm.startPrank(minter);
        wbCoin.mint(user1, MINT_AMOUNT);
        vm.stopPrank();

        vm.prank(user1);
        wbCoin.transfer(user2, 500 ether);

        assertEq(wbCoin.balanceOf(user2), 500 ether);
        assertEq(wbCoin.balanceOf(user1), 500 ether);
    }

    function test_UpgradeByUpgrader() public {
        WBCoinV2Mock v2 = new WBCoinV2Mock();

        vm.startPrank(upgrader);

        bytes32 IMPLEMENTATION_SLOT =
            bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        // 2. Read current implementation address
        address currentImpl = address(uint160(uint256(vm.load(address(wbCoin), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot):", currentImpl);

        wbCoin.upgradeToAndCall(address(v2), "");

        bytes32 IMPLEMENTATION_SLOT_UPGRADED =
            bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        // 2. Read current implementation address
        address currentImplUpgraded = address(uint160(uint256(vm.load(address(wbCoin), IMPLEMENTATION_SLOT_UPGRADED))));

        console2.log("Current implementation (via slot upgraded):", currentImplUpgraded);

        vm.stopPrank();
        assertNotEq(currentImpl, currentImplUpgraded);
    }

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBCoinV2Mock v2 = new WBCoinV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCoin.UPGRADER_ROLE()
            )
        );
        wbCoin.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }

    function test_AdminCanGrantAndRevokeRoles() public {
        vm.prank(admin);
        wbCoin.grantRole(wbCoin.MINTER_ROLE(), user1);

        assertTrue(wbCoin.hasRole(wbCoin.MINTER_ROLE(), user1));

        vm.prank(admin);
        wbCoin.revokeRole(wbCoin.MINTER_ROLE(), user1);

        assertFalse(wbCoin.hasRole(wbCoin.MINTER_ROLE(), user1));
    }

    function test_NonAdminCannotGrantRoles() public {
        vm.startPrank(user1);
        bytes32 role = wbCoin.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, role)
        );
        wbCoin.grantRole(role, user2);
        vm.stopPrank();
    }
}

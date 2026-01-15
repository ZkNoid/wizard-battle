// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console2} from "forge-std/Test.sol";
import {WBResources} from "../../src/tokens/ERC1155/WBResources.sol";
import {DeployWBResources} from "../../script/DeployWBResources.s.sol";
import {WBResourcesV2Mock} from "../mocks/WBResourcesV2Mock.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WBResourcesTest is Test {
    WBResources public wbResources;
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public attacker = makeAddr("attacker");

    function setUp() public {
        address wbResourcesAddress = new DeployWBResources().deploy();
        wbResources = WBResources(wbResourcesAddress);
    }

    /*//////////////////////////////////////////////////////////////
                          DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DeployDeploy() public {
        DeployWBResources deployer = new DeployWBResources();
        address deploy = deployer.deploy();
        assertNotEq(deploy, address(0));
    }

    function test_DeployRun() public {
        DeployWBResources deployer = new DeployWBResources();
        address run = deployer.run();
        assertNotEq(run, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Initialization() public view {
        assertTrue(wbResources.hasRole(wbResources.DEFAULT_ADMIN_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.PAUSER_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.MINTER_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.UPGRADER_ROLE(), address(this)));

        assertEq(wbResources.uri(0), "");
        assertEq(wbResources.totalSupply(1), 0);
        assertFalse(wbResources.paused());
    }

    /*//////////////////////////////////////////////////////////////
                    INITIALIZATION - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbResources.initialize(address(this), address(this), address(this), address(this));
    }

    /*//////////////////////////////////////////////////////////////
                           MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_MintByMinter() public {
        wbResources.mint(user1, 1, 5, "");

        assertEq(wbResources.balanceOf(user1, 1), 5);
        assertEq(wbResources.totalSupply(1), 5);
    }

    function test_MintBatchByMinter() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        amounts[0] = 3;
        amounts[1] = 4;

        wbResources.mintBatch(user1, ids, amounts, "");

        assertEq(wbResources.balanceOf(user1, 1), 3);
        assertEq(wbResources.balanceOf(user1, 2), 4);
        assertEq(wbResources.totalSupply(1), 3);
        assertEq(wbResources.totalSupply(2), 4);
    }

    /*//////////////////////////////////////////////////////////////
                         MINTING - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_MintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbResources.MINTER_ROLE()));
        wbResources.mint(user1, 1, 1, "");
        vm.stopPrank();
    }

    function test_MintBatchRevertsIfNotMinter() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1;
        amounts[0] = 1;

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbResources.MINTER_ROLE()));
        wbResources.mintBatch(user1, ids, amounts, "");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           BURNING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_BurnReducesSupply() public {
        wbResources.mint(user1, 1, 5, "");

        vm.prank(user1);
        wbResources.burn(user1, 1, 2);

        assertEq(wbResources.balanceOf(user1, 1), 3);
        assertEq(wbResources.totalSupply(1), 3);
    }

    function test_BurnByApprovedOperator() public {
        // Mint tokens to user1
        wbResources.mint(user1, 1, 10, "");

        // User1 approves user2 as operator
        vm.prank(user1);
        wbResources.setApprovalForAll(user2, true);

        // User2 burns user1's tokens
        vm.prank(user2);
        wbResources.burn(user1, 1, 3);

        assertEq(wbResources.balanceOf(user1, 1), 7);
        assertEq(wbResources.totalSupply(1), 7);
    }

    function test_BurnByMinter() public {
        // Mint tokens to user1
        wbResources.mint(user1, 1, 10, "");

        // address(this) has MINTER_ROLE and burns user1's tokens (without approval)
        wbResources.burn(user1, 1, 4);

        assertEq(wbResources.balanceOf(user1, 1), 6);
        assertEq(wbResources.totalSupply(1), 6);
    }

    function test_BurnRevertsIfNotAuthorized() public {
        // Mint tokens to user1
        wbResources.mint(user1, 1, 10, "");

        // Attacker tries to burn user1's tokens without approval
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ERC1155MissingApprovalForAll(address,address)")), attacker, user1));
        wbResources.burn(user1, 1, 1);
    }

    function test_BurnBatchByOwner() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        wbResources.mintBatch(user1, ids, amounts, "");

        uint256[] memory burnAmounts = new uint256[](2);
        burnAmounts[0] = 3;
        burnAmounts[1] = 5;

        vm.prank(user1);
        wbResources.burnBatch(user1, ids, burnAmounts);

        assertEq(wbResources.balanceOf(user1, 1), 7);
        assertEq(wbResources.balanceOf(user1, 2), 15);
    }

    function test_BurnBatchByApprovedOperator() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        wbResources.mintBatch(user1, ids, amounts, "");

        // User1 approves user2 as operator
        vm.prank(user1);
        wbResources.setApprovalForAll(user2, true);

        uint256[] memory burnAmounts = new uint256[](2);
        burnAmounts[0] = 2;
        burnAmounts[1] = 4;

        vm.prank(user2);
        wbResources.burnBatch(user1, ids, burnAmounts);

        assertEq(wbResources.balanceOf(user1, 1), 8);
        assertEq(wbResources.balanceOf(user1, 2), 16);
    }

    function test_BurnBatchByMinter() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        wbResources.mintBatch(user1, ids, amounts, "");

        uint256[] memory burnAmounts = new uint256[](2);
        burnAmounts[0] = 1;
        burnAmounts[1] = 3;

        // address(this) has MINTER_ROLE
        wbResources.burnBatch(user1, ids, burnAmounts);

        assertEq(wbResources.balanceOf(user1, 1), 9);
        assertEq(wbResources.balanceOf(user1, 2), 17);
    }

    function test_BurnBatchRevertsIfNotAuthorized() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10;
        amounts[1] = 20;

        wbResources.mintBatch(user1, ids, amounts, "");

        uint256[] memory burnAmounts = new uint256[](2);
        burnAmounts[0] = 1;
        burnAmounts[1] = 1;

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ERC1155MissingApprovalForAll(address,address)")), attacker, user1));
        wbResources.burnBatch(user1, ids, burnAmounts);
    }

    /*//////////////////////////////////////////////////////////////
                         PAUSE/UNPAUSE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseAndUnpause() public {
        wbResources.pause();
        assertTrue(wbResources.paused());

        wbResources.unpause();
        assertFalse(wbResources.paused());
    }

    /*//////////////////////////////////////////////////////////////
                       PAUSE/UNPAUSE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbResources.PAUSER_ROLE()));
        wbResources.pause();
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_TransfersBlockedWhenPaused() public {
        wbResources.mint(user1, 1, 5, "");

        wbResources.pause();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        wbResources.safeTransferFrom(user1, user2, 1, 1, "");
    }

    function test_TransfersAllowedWhenUnpaused() public {
        wbResources.mint(user1, 1, 5, "");

        vm.prank(user1);
        wbResources.safeTransferFrom(user1, user2, 1, 2, "");

        assertEq(wbResources.balanceOf(user1, 1), 3);
        assertEq(wbResources.balanceOf(user2, 1), 2);
    }

    /*//////////////////////////////////////////////////////////////
                      INTERFACE SUPPORT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SupportsInterface() public view {
        assertTrue(wbResources.supportsInterface(type(IERC1155).interfaceId));
        assertTrue(wbResources.supportsInterface(type(IAccessControl).interfaceId));
    }

    /*//////////////////////////////////////////////////////////////
                           UPGRADE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeByUpgrader() public {
        WBResourcesV2Mock v2 = new WBResourcesV2Mock();

        // Verify mock version
        assertEq(v2.version(), 2);
        assertEq(v2.newFunction(), "Upgraded!");

        bytes32 IMPLEMENTATION_SLOT = bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        // Read current implementation address
        address currentImpl = address(uint160(uint256(vm.load(address(wbResources), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot):", currentImpl);

        wbResources.upgradeToAndCall(address(v2), "");

        // Read upgraded implementation address
        address currentImplUpgraded = address(uint160(uint256(vm.load(address(wbResources), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot upgraded):", currentImplUpgraded);

        assertNotEq(currentImpl, currentImplUpgraded);
        assertEq(currentImplUpgraded, address(v2));
    }

    /*//////////////////////////////////////////////////////////////
                         UPGRADE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBResourcesV2Mock v2 = new WBResourcesV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbResources.UPGRADER_ROLE()));
        wbResources.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }
}

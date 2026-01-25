// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console2} from "forge-std/Test.sol";
import {WBItems} from "../../src/tokens/ERC721/WBItems.sol";
import {DeployWBItems} from "../../script/DeployWBItems.s.sol";
import {WBItemsV2Mock} from "../mocks/WBItemsV2Mock.sol";
import {WBItemsTestHelper} from "../mocks/WBItemsTestHelper.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WBItemsTest is Test {
    WBItems public wbItems;
    address public proxy;

    address public admin;
    address public pauser;
    address public minter;
    address public upgrader;
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public attacker = makeAddr("attacker");

    string public constant TOKEN_URI_1 = "ipfs://QmToken1";
    string public constant TOKEN_URI_2 = "ipfs://QmToken2";

    function setUp() public {
        DeployWBItems deployer = new DeployWBItems();
        proxy = deployer.deploy();
        wbItems = WBItems(proxy);

        admin = address(this);
        pauser = address(this);
        minter = address(this);
        upgrader = address(this);
    }

    /*//////////////////////////////////////////////////////////////
                          DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DeployDeploy() public {
        DeployWBItems deployer = new DeployWBItems();
        address deploy = deployer.deploy();
        assertNotEq(deploy, address(0));
    }

    function test_DeployRun() public {
        DeployWBItems deployer = new DeployWBItems();
        address run = deployer.run();
        assertNotEq(run, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Initialization() public view {
        assertEq(wbItems.name(), "WBItems");
        assertEq(wbItems.symbol(), "WBCH");
        assertEq(wbItems.totalSupply(), 0);
        assertFalse(wbItems.paused());

        assertTrue(wbItems.hasRole(wbItems.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(wbItems.hasRole(wbItems.PAUSER_ROLE(), pauser));
        assertTrue(wbItems.hasRole(wbItems.MINTER_ROLE(), minter));
        assertTrue(wbItems.hasRole(wbItems.UPGRADER_ROLE(), upgrader));
    }

    /*//////////////////////////////////////////////////////////////
                    INITIALIZATION - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbItems.initialize(admin, pauser, minter, upgrader);
    }

    /*//////////////////////////////////////////////////////////////
                           MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_mintByMinter() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);

        assertEq(tokenId, 0);
        assertEq(wbItems.ownerOf(tokenId), user1);
        assertEq(wbItems.balanceOf(user1), 1);
        assertEq(wbItems.totalSupply(), 1);
        console2.log("Token URI:", wbItems.tokenURI(tokenId));
        //assertEq(wbItems.tokenURI(tokenId), TOKEN_URI_1);
    }

    function test_mintMultipleTokens() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbItems.mint(user1);
        uint256 tokenId2 = wbItems.mint(user2);
        vm.stopPrank();

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(wbItems.ownerOf(tokenId1), user1);
        assertEq(wbItems.ownerOf(tokenId2), user2);
        assertEq(wbItems.totalSupply(), 2);

        console2.log("Token URI:", wbItems.tokenURI(tokenId1));
        // assertEq(wbItems.tokenURI(tokenId1), TOKEN_URI_1);
        // assertEq(wbItems.tokenURI(tokenId2), TOKEN_URI_2);
    }

    /*//////////////////////////////////////////////////////////////
                         MINTING - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_mintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbItems.MINTER_ROLE()));
        wbItems.mint(user1);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         PAUSE/UNPAUSE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseByPauser() public {
        vm.prank(pauser);
        wbItems.pause();

        assertTrue(wbItems.paused());
    }

    function test_UnpauseByPauser() public {
        vm.prank(pauser);
        wbItems.pause();

        vm.prank(pauser);
        wbItems.unpause();

        assertFalse(wbItems.paused());
    }

    /*//////////////////////////////////////////////////////////////
                       PAUSE/UNPAUSE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbItems.PAUSER_ROLE()));
        wbItems.pause();
        vm.stopPrank();
    }

    function test_UnpauseRevertsIfNotPauser() public {
        vm.prank(pauser);
        wbItems.pause();

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbItems.PAUSER_ROLE()));
        wbItems.unpause();
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_TransfersBlockedWhenPaused() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);

        vm.prank(pauser);
        wbItems.pause();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        wbItems.transferFrom(user1, user2, tokenId);
    }

    function test_TransfersAllowedWhenUnpaused() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);

        vm.prank(pauser);
        wbItems.pause();

        vm.prank(pauser);
        wbItems.unpause();

        vm.prank(user1);
        wbItems.transferFrom(user1, user2, tokenId);

        assertEq(wbItems.ownerOf(tokenId), user2);
        assertEq(wbItems.balanceOf(user1), 0);
        assertEq(wbItems.balanceOf(user2), 1);
    }

    function test_SafeTransferFrom() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);

        vm.prank(user1);
        wbItems.safeTransferFrom(user1, user2, tokenId);

        assertEq(wbItems.ownerOf(tokenId), user2);
        assertEq(wbItems.balanceOf(user1), 0);
        assertEq(wbItems.balanceOf(user2), 1);
    }

    /*//////////////////////////////////////////////////////////////
                           BURNING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Burn() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);
        vm.prank(user1);
        wbItems.burn(tokenId);

        assertEq(wbItems.balanceOf(user1), 0);
        assertEq(wbItems.totalSupply(), 0);
        vm.expectRevert();
        wbItems.ownerOf(tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                         BURNING - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_BurnRevertsIfNotOwner() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);
        vm.startPrank(attacker);
        vm.expectRevert();
        wbItems.burn(tokenId);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         ENUMERABLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_EnumerableFunctions() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbItems.mint(user1);
        uint256 tokenId2 = wbItems.mint(user1);
        uint256 tokenId3 = wbItems.mint(user2);
        vm.stopPrank();

        assertEq(wbItems.totalSupply(), 3);
        assertEq(wbItems.tokenByIndex(0), tokenId1);
        assertEq(wbItems.tokenByIndex(1), tokenId2);
        assertEq(wbItems.tokenByIndex(2), tokenId3);

        assertEq(wbItems.balanceOf(user1), 2);
        assertEq(wbItems.tokenOfOwnerByIndex(user1, 0), tokenId1);
        assertEq(wbItems.tokenOfOwnerByIndex(user1, 1), tokenId2);

        assertEq(wbItems.balanceOf(user2), 1);
        assertEq(wbItems.tokenOfOwnerByIndex(user2, 0), tokenId3);
    }

    function test_EnumerableAfterTransfer() public {
        vm.prank(minter);
        uint256 tokenId1 = wbItems.mint(user1);
        uint256 tokenId2 = wbItems.mint(user1);

        vm.prank(user1);
        wbItems.transferFrom(user1, user2, tokenId1);
        assertEq(wbItems.balanceOf(user1), 1);
        assertEq(wbItems.tokenOfOwnerByIndex(user1, 0), tokenId2);

        assertEq(wbItems.balanceOf(user2), 1);
        assertEq(wbItems.tokenOfOwnerByIndex(user2, 0), tokenId1);
    }

    function test_EnumerableAfterBurn() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbItems.mint(user1);
        uint256 tokenId2 = wbItems.mint(user1);
        vm.stopPrank();

        vm.prank(user1);
        wbItems.burn(tokenId1);

        assertEq(wbItems.totalSupply(), 1);
        assertEq(wbItems.tokenByIndex(0), tokenId2);
        assertEq(wbItems.balanceOf(user1), 1);
        assertEq(wbItems.tokenOfOwnerByIndex(user1, 0), tokenId2);
    }

    /*//////////////////////////////////////////////////////////////
                      INTERFACE SUPPORT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SupportsInterface() public view {
        assertTrue(wbItems.supportsInterface(type(IERC721).interfaceId));
        assertTrue(wbItems.supportsInterface(type(IERC721Metadata).interfaceId));
        assertTrue(wbItems.supportsInterface(type(IERC721Enumerable).interfaceId));
        assertTrue(wbItems.supportsInterface(type(IAccessControl).interfaceId));
    }

    /*//////////////////////////////////////////////////////////////
                           UPGRADE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeByUpgrader() public {
        WBItemsV2Mock v2 = new WBItemsV2Mock();

        // Verify mock version
        assertEq(v2.version(), 2);
        assertEq(v2.newFunction(), "Upgraded!");

        bytes32 IMPLEMENTATION_SLOT = bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        address currentImpl = address(uint160(uint256(vm.load(address(wbItems), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot):", currentImpl);

        vm.prank(upgrader);
        wbItems.upgradeToAndCall(address(v2), "");

        address currentImplUpgraded = address(uint160(uint256(vm.load(address(wbItems), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot upgraded):", currentImplUpgraded);

        assertNotEq(currentImpl, currentImplUpgraded);
        assertEq(currentImplUpgraded, address(v2));
    }

    /*//////////////////////////////////////////////////////////////
                         UPGRADE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBItemsV2Mock v2 = new WBItemsV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbItems.UPGRADER_ROLE()));
        wbItems.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                      ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AdminCanGrantAndRevokeRoles() public {
        vm.prank(admin);
        wbItems.grantRole(wbItems.MINTER_ROLE(), user1);

        assertTrue(wbItems.hasRole(wbItems.MINTER_ROLE(), user1));

        vm.prank(admin);
        wbItems.revokeRole(wbItems.MINTER_ROLE(), user1);

        assertFalse(wbItems.hasRole(wbItems.MINTER_ROLE(), user1));
    }

    /*//////////////////////////////////////////////////////////////
                    ACCESS CONTROL - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_NonAdminCannotGrantRoles() public {
        vm.startPrank(user1);
        bytes32 role = wbItems.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, role));
        wbItems.grantRole(role, user2);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         APPROVAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Approve() public {
        vm.prank(minter);
        uint256 tokenId = wbItems.mint(user1);

        vm.prank(user1);
        wbItems.approve(user2, tokenId);

        assertEq(wbItems.getApproved(tokenId), user2);
    }

    function test_SetApprovalForAll() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbItems.mint(user1);
        wbItems.mint(user1);
        vm.stopPrank();

        vm.prank(user1);
        wbItems.setApprovalForAll(user2, true);

        assertTrue(wbItems.isApprovedForAll(user1, user2));

        vm.prank(user2);
        wbItems.transferFrom(user1, user2, tokenId1);

        assertEq(wbItems.ownerOf(tokenId1), user2);
    }

    /*//////////////////////////////////////////////////////////////
                       INTERNAL FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IncreaseBalance() public {
        // Deploy test helper implementation
        WBItemsTestHelper implementation = new WBItemsTestHelper();

        // Create proxy and initialize it
        ERC1967Proxy helperProxy = new ERC1967Proxy(address(implementation), abi.encodeCall(wbItems.initialize, (admin, pauser, minter, upgrader)));

        WBItemsTestHelper helper = WBItemsTestHelper(address(helperProxy));

        // Get initial balance
        uint256 initialBalance = helper.balanceOf(user1);

        // Call _increaseBalance with amount 0 (this is what ERC721Enumerable allows)
        // This will trigger wbItems's _increaseBalance override through ERC721Enumerable
        helper.exposeIncreaseBalance(user1, 0);

        // Verify the balance wasn't changed (since amount was 0)
        // This test ensures the _increaseBalance function is executed
        assertEq(helper.balanceOf(user1), initialBalance);
    }
}

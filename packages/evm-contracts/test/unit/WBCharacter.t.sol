// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console2} from "forge-std/Test.sol";
import {WBCharacters} from "../../src/tokens/ERC721/WBCharacters.sol";
import {DeployWBCharacters} from "../../script/DeployWBCharacters.s.sol";
import {WBCharactersV2Mock} from "../mocks/WBCharactersV2Mock.sol";
import {WBCharactersTestHelper} from "../mocks/WBCharactersTestHelper.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WBCharactersTest is Test {
    WBCharacters public wbCharacters;
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
        DeployWBCharacters deployer = new DeployWBCharacters();
        proxy = deployer.deploy();
        wbCharacters = WBCharacters(proxy);

        admin = address(this);
        pauser = address(this);
        minter = address(this);
        upgrader = address(this);
    }

    /*//////////////////////////////////////////////////////////////
                          DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DeployDeploy() public {
        DeployWBCharacters deployer = new DeployWBCharacters();
        address deploy = deployer.deploy();
        assertNotEq(deploy, address(0));
    }

    function test_DeployRun() public {
        DeployWBCharacters deployer = new DeployWBCharacters();
        address run = deployer.run();
        assertNotEq(run, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Initialization() public view {
        assertEq(wbCharacters.name(), "WBCharacters");
        assertEq(wbCharacters.symbol(), "WBCH");
        assertEq(wbCharacters.totalSupply(), 0);
        assertFalse(wbCharacters.paused());

        assertTrue(wbCharacters.hasRole(wbCharacters.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(wbCharacters.hasRole(wbCharacters.PAUSER_ROLE(), pauser));
        assertTrue(wbCharacters.hasRole(wbCharacters.MINTER_ROLE(), minter));
        assertTrue(wbCharacters.hasRole(wbCharacters.UPGRADER_ROLE(), upgrader));
    }

    /*//////////////////////////////////////////////////////////////
                    INITIALIZATION - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbCharacters.initialize(admin, pauser, minter, upgrader);
    }

    /*//////////////////////////////////////////////////////////////
                           MINTING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_mintByMinter() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);

        assertEq(tokenId, 0);
        assertEq(wbCharacters.ownerOf(tokenId), user1);
        assertEq(wbCharacters.balanceOf(user1), 1);
        assertEq(wbCharacters.totalSupply(), 1);
        console2.log("Token URI:", wbCharacters.tokenURI(tokenId));
        //assertEq(wbCharacters.tokenURI(tokenId), TOKEN_URI_1);
    }

    function test_mintMultipleTokens() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacters.mint(user1);
        uint256 tokenId2 = wbCharacters.mint(user2);
        vm.stopPrank();

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(wbCharacters.ownerOf(tokenId1), user1);
        assertEq(wbCharacters.ownerOf(tokenId2), user2);
        assertEq(wbCharacters.totalSupply(), 2);

        console2.log("Token URI:", wbCharacters.tokenURI(tokenId1));
        // assertEq(wbCharacters.tokenURI(tokenId1), TOKEN_URI_1);
        // assertEq(wbCharacters.tokenURI(tokenId2), TOKEN_URI_2);
    }

    /*//////////////////////////////////////////////////////////////
                         MINTING - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_mintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCharacters.MINTER_ROLE()));
        wbCharacters.mint(user1);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         PAUSE/UNPAUSE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseByPauser() public {
        vm.prank(pauser);
        wbCharacters.pause();

        assertTrue(wbCharacters.paused());
    }

    function test_UnpauseByPauser() public {
        vm.prank(pauser);
        wbCharacters.pause();

        vm.prank(pauser);
        wbCharacters.unpause();

        assertFalse(wbCharacters.paused());
    }

    /*//////////////////////////////////////////////////////////////
                       PAUSE/UNPAUSE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCharacters.PAUSER_ROLE()));
        wbCharacters.pause();
        vm.stopPrank();
    }

    function test_UnpauseRevertsIfNotPauser() public {
        vm.prank(pauser);
        wbCharacters.pause();

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCharacters.PAUSER_ROLE()));
        wbCharacters.unpause();
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                           TRANSFER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_TransfersBlockedWhenPaused() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);

        vm.prank(pauser);
        wbCharacters.pause();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        wbCharacters.transferFrom(user1, user2, tokenId);
    }

    function test_TransfersAllowedWhenUnpaused() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);

        vm.prank(pauser);
        wbCharacters.pause();

        vm.prank(pauser);
        wbCharacters.unpause();

        vm.prank(user1);
        wbCharacters.transferFrom(user1, user2, tokenId);

        assertEq(wbCharacters.ownerOf(tokenId), user2);
        assertEq(wbCharacters.balanceOf(user1), 0);
        assertEq(wbCharacters.balanceOf(user2), 1);
    }

    function test_SafeTransferFrom() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);

        vm.prank(user1);
        wbCharacters.safeTransferFrom(user1, user2, tokenId);

        assertEq(wbCharacters.ownerOf(tokenId), user2);
        assertEq(wbCharacters.balanceOf(user1), 0);
        assertEq(wbCharacters.balanceOf(user2), 1);
    }

    /*//////////////////////////////////////////////////////////////
                           BURNING TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Burn() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);
        vm.prank(user1);
        wbCharacters.burn(tokenId);

        assertEq(wbCharacters.balanceOf(user1), 0);
        assertEq(wbCharacters.totalSupply(), 0);
        vm.expectRevert();
        wbCharacters.ownerOf(tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                         BURNING - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_BurnRevertsIfNotOwner() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);
        vm.startPrank(attacker);
        vm.expectRevert();
        wbCharacters.burn(tokenId);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         ENUMERABLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_EnumerableFunctions() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacters.mint(user1);
        uint256 tokenId2 = wbCharacters.mint(user1);
        uint256 tokenId3 = wbCharacters.mint(user2);
        vm.stopPrank();

        assertEq(wbCharacters.totalSupply(), 3);
        assertEq(wbCharacters.tokenByIndex(0), tokenId1);
        assertEq(wbCharacters.tokenByIndex(1), tokenId2);
        assertEq(wbCharacters.tokenByIndex(2), tokenId3);

        assertEq(wbCharacters.balanceOf(user1), 2);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user1, 0), tokenId1);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user1, 1), tokenId2);

        assertEq(wbCharacters.balanceOf(user2), 1);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user2, 0), tokenId3);
    }

    function test_EnumerableAfterTransfer() public {
        vm.prank(minter);
        uint256 tokenId1 = wbCharacters.mint(user1);
        uint256 tokenId2 = wbCharacters.mint(user1);

        vm.prank(user1);
        wbCharacters.transferFrom(user1, user2, tokenId1);
        assertEq(wbCharacters.balanceOf(user1), 1);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user1, 0), tokenId2);

        assertEq(wbCharacters.balanceOf(user2), 1);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user2, 0), tokenId1);
    }

    function test_EnumerableAfterBurn() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacters.mint(user1);
        uint256 tokenId2 = wbCharacters.mint(user1);
        vm.stopPrank();

        vm.prank(user1);
        wbCharacters.burn(tokenId1);

        assertEq(wbCharacters.totalSupply(), 1);
        assertEq(wbCharacters.tokenByIndex(0), tokenId2);
        assertEq(wbCharacters.balanceOf(user1), 1);
        assertEq(wbCharacters.tokenOfOwnerByIndex(user1, 0), tokenId2);
    }

    /*//////////////////////////////////////////////////////////////
                      INTERFACE SUPPORT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SupportsInterface() public view {
        assertTrue(wbCharacters.supportsInterface(type(IERC721).interfaceId));
        assertTrue(wbCharacters.supportsInterface(type(IERC721Metadata).interfaceId));
        assertTrue(wbCharacters.supportsInterface(type(IERC721Enumerable).interfaceId));
        assertTrue(wbCharacters.supportsInterface(type(IAccessControl).interfaceId));
    }

    /*//////////////////////////////////////////////////////////////
                           UPGRADE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeByUpgrader() public {
        WBCharactersV2Mock v2 = new WBCharactersV2Mock();

        // Verify mock version
        assertEq(v2.version(), 2);
        assertEq(v2.newFunction(), "Upgraded!");

        bytes32 IMPLEMENTATION_SLOT = bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        address currentImpl = address(uint160(uint256(vm.load(address(wbCharacters), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot):", currentImpl);

        vm.prank(upgrader);
        wbCharacters.upgradeToAndCall(address(v2), "");

        address currentImplUpgraded = address(uint160(uint256(vm.load(address(wbCharacters), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot upgraded):", currentImplUpgraded);

        assertNotEq(currentImpl, currentImplUpgraded);
        assertEq(currentImplUpgraded, address(v2));
    }

    /*//////////////////////////////////////////////////////////////
                         UPGRADE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBCharactersV2Mock v2 = new WBCharactersV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, wbCharacters.UPGRADER_ROLE()));
        wbCharacters.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                      ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AdminCanGrantAndRevokeRoles() public {
        vm.prank(admin);
        wbCharacters.grantRole(wbCharacters.MINTER_ROLE(), user1);

        assertTrue(wbCharacters.hasRole(wbCharacters.MINTER_ROLE(), user1));

        vm.prank(admin);
        wbCharacters.revokeRole(wbCharacters.MINTER_ROLE(), user1);

        assertFalse(wbCharacters.hasRole(wbCharacters.MINTER_ROLE(), user1));
    }

    /*//////////////////////////////////////////////////////////////
                    ACCESS CONTROL - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_NonAdminCannotGrantRoles() public {
        vm.startPrank(user1);
        bytes32 role = wbCharacters.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), user1, role));
        wbCharacters.grantRole(role, user2);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                         APPROVAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Approve() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacters.mint(user1);

        vm.prank(user1);
        wbCharacters.approve(user2, tokenId);

        assertEq(wbCharacters.getApproved(tokenId), user2);
    }

    function test_SetApprovalForAll() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacters.mint(user1);
        wbCharacters.mint(user1);
        vm.stopPrank();

        vm.prank(user1);
        wbCharacters.setApprovalForAll(user2, true);

        assertTrue(wbCharacters.isApprovedForAll(user1, user2));

        vm.prank(user2);
        wbCharacters.transferFrom(user1, user2, tokenId1);

        assertEq(wbCharacters.ownerOf(tokenId1), user2);
    }

    /*//////////////////////////////////////////////////////////////
                       INTERNAL FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_IncreaseBalance() public {
        // Deploy test helper implementation
        WBCharactersTestHelper implementation = new WBCharactersTestHelper();

        // Create proxy and initialize it
        ERC1967Proxy helperProxy = new ERC1967Proxy(address(implementation), abi.encodeCall(WBCharacters.initialize, (admin, pauser, minter, upgrader)));

        WBCharactersTestHelper helper = WBCharactersTestHelper(address(helperProxy));

        // Get initial balance
        uint256 initialBalance = helper.balanceOf(user1);

        // Call _increaseBalance with amount 0 (this is what ERC721Enumerable allows)
        // This will trigger WBCharacters's _increaseBalance override through ERC721Enumerable
        helper.exposeIncreaseBalance(user1, 0);

        // Verify the balance wasn't changed (since amount was 0)
        // This test ensures the _increaseBalance function is executed
        assertEq(helper.balanceOf(user1), initialBalance);
    }

    /*//////////////////////////////////////////////////////////////
                                  URI
    //////////////////////////////////////////////////////////////*/
    function test_uriTokenId() public {
        uint256 tokenId = wbCharacters.mint(user1);
        tokenId = wbCharacters.mint(user1);
        wbCharacters.setURI("https://wizard.zknoid.io/nft/characters/");
        string memory uri = wbCharacters.tokenURI(tokenId);
        console2.log("uri: ", uri);
    }
}

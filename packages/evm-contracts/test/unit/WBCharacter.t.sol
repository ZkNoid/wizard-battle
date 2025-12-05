// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console2} from "forge-std/Test.sol";
import {WBCharacter} from "../../src/tokens/ERC721/WBCharacter.sol";
import {DeployWBCharacter} from "../../script/DeployWBCharacter.s.sol";
import {WBCharacterV2Mock} from "../mocks/WBCharacterV2Mock.sol";
import {WBCharacterTestHelper} from "../mocks/WBCharacterTestHelper.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract WBCharacterTest is Test {
    WBCharacter public wbCharacter;
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
        DeployWBCharacter deployer = new DeployWBCharacter();
        proxy = deployer.deploy();
        wbCharacter = WBCharacter(proxy);

        admin = address(this);
        pauser = address(this);
        minter = address(this);
        upgrader = address(this);
    }

    function test_DeployDeploy() public {
        DeployWBCharacter deployer = new DeployWBCharacter();
        address deploy = deployer.deploy();
        assertNotEq(deploy, address(0));
    }

    function test_DeployRun() public {
        DeployWBCharacter deployer = new DeployWBCharacter();
        address run = deployer.run();
        assertNotEq(run, address(0));
    }

    function test_Initialization() public view {
        assertEq(wbCharacter.name(), "WBCharacter");
        assertEq(wbCharacter.symbol(), "WBCH");
        assertEq(wbCharacter.totalSupply(), 0);
        assertFalse(wbCharacter.paused());

        assertTrue(wbCharacter.hasRole(wbCharacter.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(wbCharacter.hasRole(wbCharacter.PAUSER_ROLE(), pauser));
        assertTrue(wbCharacter.hasRole(wbCharacter.MINTER_ROLE(), minter));
        assertTrue(wbCharacter.hasRole(wbCharacter.UPGRADER_ROLE(), upgrader));
    }

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbCharacter.initialize(admin, pauser, minter, upgrader);
    }

    function test_SafeMintByMinter() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        assertEq(tokenId, 0);
        assertEq(wbCharacter.ownerOf(tokenId), user1);
        assertEq(wbCharacter.balanceOf(user1), 1);
        assertEq(wbCharacter.totalSupply(), 1);
        assertEq(wbCharacter.tokenURI(tokenId), TOKEN_URI_1);
    }

    function test_SafeMintMultipleTokens() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacter.safeMint(user1, TOKEN_URI_1);
        uint256 tokenId2 = wbCharacter.safeMint(user2, TOKEN_URI_2);
        vm.stopPrank();

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(wbCharacter.ownerOf(tokenId1), user1);
        assertEq(wbCharacter.ownerOf(tokenId2), user2);
        assertEq(wbCharacter.totalSupply(), 2);
        assertEq(wbCharacter.tokenURI(tokenId1), TOKEN_URI_1);
        assertEq(wbCharacter.tokenURI(tokenId2), TOKEN_URI_2);
    }

    function test_SafeMintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbCharacter.MINTER_ROLE()
            )
        );
        wbCharacter.safeMint(user1, TOKEN_URI_1);
        vm.stopPrank();
    }

    function test_PauseByPauser() public {
        vm.prank(pauser);
        wbCharacter.pause();

        assertTrue(wbCharacter.paused());
    }

    function test_UnpauseByPauser() public {
        vm.prank(pauser);
        wbCharacter.pause();

        vm.prank(pauser);
        wbCharacter.unpause();

        assertFalse(wbCharacter.paused());
    }

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbCharacter.PAUSER_ROLE()
            )
        );
        wbCharacter.pause();
        vm.stopPrank();
    }

    function test_UnpauseRevertsIfNotPauser() public {
        vm.prank(pauser);
        wbCharacter.pause();

        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbCharacter.PAUSER_ROLE()
            )
        );
        wbCharacter.unpause();
        vm.stopPrank();
    }

    function test_TransfersBlockedWhenPaused() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.prank(pauser);
        wbCharacter.pause();

        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        wbCharacter.transferFrom(user1, user2, tokenId);
    }

    function test_TransfersAllowedWhenUnpaused() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.prank(pauser);
        wbCharacter.pause();

        vm.prank(pauser);
        wbCharacter.unpause();

        vm.prank(user1);
        wbCharacter.transferFrom(user1, user2, tokenId);

        assertEq(wbCharacter.ownerOf(tokenId), user2);
        assertEq(wbCharacter.balanceOf(user1), 0);
        assertEq(wbCharacter.balanceOf(user2), 1);
    }

    function test_TokenURI() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        assertEq(wbCharacter.tokenURI(tokenId), TOKEN_URI_1);
    }

    function test_TokenURIRevertsForNonExistentToken() public {
        vm.expectRevert();
        wbCharacter.tokenURI(999);
    }

    function test_Burn() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.prank(user1);
        wbCharacter.burn(tokenId);

        assertEq(wbCharacter.balanceOf(user1), 0);
        assertEq(wbCharacter.totalSupply(), 0);
        vm.expectRevert();
        wbCharacter.ownerOf(tokenId);
    }

    function test_BurnRevertsIfNotOwner() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.startPrank(attacker);
        vm.expectRevert();
        wbCharacter.burn(tokenId);
        vm.stopPrank();
    }

    function test_EnumerableFunctions() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacter.safeMint(user1, TOKEN_URI_1);
        uint256 tokenId2 = wbCharacter.safeMint(user1, TOKEN_URI_2);
        uint256 tokenId3 = wbCharacter.safeMint(user2, TOKEN_URI_1);
        vm.stopPrank();

        assertEq(wbCharacter.totalSupply(), 3);
        assertEq(wbCharacter.tokenByIndex(0), tokenId1);
        assertEq(wbCharacter.tokenByIndex(1), tokenId2);
        assertEq(wbCharacter.tokenByIndex(2), tokenId3);

        assertEq(wbCharacter.balanceOf(user1), 2);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user1, 0), tokenId1);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user1, 1), tokenId2);

        assertEq(wbCharacter.balanceOf(user2), 1);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user2, 0), tokenId3);
    }

    function test_EnumerableAfterTransfer() public {
        vm.prank(minter);
        uint256 tokenId1 = wbCharacter.safeMint(user1, TOKEN_URI_1);
        uint256 tokenId2 = wbCharacter.safeMint(user1, TOKEN_URI_2);

        vm.prank(user1);
        wbCharacter.transferFrom(user1, user2, tokenId1);

        assertEq(wbCharacter.balanceOf(user1), 1);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user1, 0), tokenId2);

        assertEq(wbCharacter.balanceOf(user2), 1);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user2, 0), tokenId1);
    }

    function test_EnumerableAfterBurn() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacter.safeMint(user1, TOKEN_URI_1);
        uint256 tokenId2 = wbCharacter.safeMint(user1, TOKEN_URI_2);
        vm.stopPrank();

        vm.prank(user1);
        wbCharacter.burn(tokenId1);

        assertEq(wbCharacter.totalSupply(), 1);
        assertEq(wbCharacter.tokenByIndex(0), tokenId2);
        assertEq(wbCharacter.balanceOf(user1), 1);
        assertEq(wbCharacter.tokenOfOwnerByIndex(user1, 0), tokenId2);
    }

    function test_SupportsInterface() public view {
        assertTrue(wbCharacter.supportsInterface(type(IERC721).interfaceId));
        assertTrue(wbCharacter.supportsInterface(type(IERC721Metadata).interfaceId));
        assertTrue(wbCharacter.supportsInterface(type(IERC721Enumerable).interfaceId));
        assertTrue(wbCharacter.supportsInterface(type(IAccessControl).interfaceId));
    }

    function test_UpgradeByUpgrader() public {
        WBCharacterV2Mock v2 = new WBCharacterV2Mock();

        bytes32 IMPLEMENTATION_SLOT =
            bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

        address currentImpl = address(uint160(uint256(vm.load(address(wbCharacter), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot):", currentImpl);

        vm.prank(upgrader);
        wbCharacter.upgradeToAndCall(address(v2), "");

        address currentImplUpgraded = address(uint160(uint256(vm.load(address(wbCharacter), IMPLEMENTATION_SLOT))));

        console2.log("Current implementation (via slot upgraded):", currentImplUpgraded);

        assertNotEq(currentImpl, currentImplUpgraded);
        assertEq(currentImplUpgraded, address(v2));
    }

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBCharacterV2Mock v2 = new WBCharacterV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbCharacter.UPGRADER_ROLE()
            )
        );
        wbCharacter.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }

    function test_AdminCanGrantAndRevokeRoles() public {
        vm.prank(admin);
        wbCharacter.grantRole(wbCharacter.MINTER_ROLE(), user1);

        assertTrue(wbCharacter.hasRole(wbCharacter.MINTER_ROLE(), user1));

        vm.prank(admin);
        wbCharacter.revokeRole(wbCharacter.MINTER_ROLE(), user1);

        assertFalse(wbCharacter.hasRole(wbCharacter.MINTER_ROLE(), user1));
    }

    function test_NonAdminCannotGrantRoles() public {
        vm.startPrank(user1);
        bytes32 role = wbCharacter.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                user1,
                role
            )
        );
        wbCharacter.grantRole(role, user2);
        vm.stopPrank();
    }

    function test_SafeTransferFrom() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.prank(user1);
        wbCharacter.safeTransferFrom(user1, user2, tokenId);

        assertEq(wbCharacter.ownerOf(tokenId), user2);
        assertEq(wbCharacter.balanceOf(user1), 0);
        assertEq(wbCharacter.balanceOf(user2), 1);
    }

    function test_Approve() public {
        vm.prank(minter);
        uint256 tokenId = wbCharacter.safeMint(user1, TOKEN_URI_1);

        vm.prank(user1);
        wbCharacter.approve(user2, tokenId);

        assertEq(wbCharacter.getApproved(tokenId), user2);
    }

    function test_SetApprovalForAll() public {
        vm.startPrank(minter);
        uint256 tokenId1 = wbCharacter.safeMint(user1, TOKEN_URI_1);
        wbCharacter.safeMint(user1, TOKEN_URI_2);
        vm.stopPrank();

        vm.prank(user1);
        wbCharacter.setApprovalForAll(user2, true);

        assertTrue(wbCharacter.isApprovedForAll(user1, user2));

        vm.prank(user2);
        wbCharacter.transferFrom(user1, user2, tokenId1);

        assertEq(wbCharacter.ownerOf(tokenId1), user2);
    }

    function test_IncreaseBalance() public {
        // Deploy test helper implementation
        WBCharacterTestHelper implementation = new WBCharacterTestHelper();
        
        // Create proxy and initialize it
        ERC1967Proxy helperProxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeCall(WBCharacter.initialize, (admin, pauser, minter, upgrader))
        );
        
        WBCharacterTestHelper helper = WBCharacterTestHelper(address(helperProxy));
        
        // Get initial balance
        uint256 initialBalance = helper.balanceOf(user1);
        
        // Call _increaseBalance with amount 0 (this is what ERC721Enumerable allows)
        // This will trigger WBCharacter's _increaseBalance override through ERC721Enumerable
        helper.exposeIncreaseBalance(user1, 0);
        
        // Verify the balance wasn't changed (since amount was 0)
        // This test ensures the _increaseBalance function is executed
        assertEq(helper.balanceOf(user1), initialBalance);
    }
}

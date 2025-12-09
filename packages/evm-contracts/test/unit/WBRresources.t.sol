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

    function test_setURI() public {
        wbResources.setURI(0, "ipfs://base/{id}");
        assertEq(wbResources.uri(0), "ipfs://base/{id}");
    }

    function test_setURIRevertsIfNotURISetter() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.URI_SETTER_ROLE()
            )
        );
        wbResources.setURI(0, "ipfs://forbidden/{id}");
        vm.stopPrank();
    }

    function test_Initialization() public view {
        assertTrue(wbResources.hasRole(wbResources.DEFAULT_ADMIN_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.PAUSER_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.MINTER_ROLE(), address(this)));
        assertTrue(wbResources.hasRole(wbResources.UPGRADER_ROLE(), address(this)));

        assertEq(wbResources.uri(0), "");
        assertEq(wbResources.totalSupply(1), 0);
        assertFalse(wbResources.paused());
    }

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert();
        wbResources.initialize(address(this), address(this), address(this), address(this));
    }

    function test_MintByMinter() public {
        wbResources.mint(user1, 1, 5, "");

        assertEq(wbResources.balanceOf(user1, 1), 5);
        assertEq(wbResources.totalSupply(1), 5);
    }

    function test_MintRevertsIfNotMinter() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.MINTER_ROLE()
            )
        );
        wbResources.mint(user1, 1, 1, "");
        vm.stopPrank();
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

    function test_MintBatchRevertsIfNotMinter() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = 1;
        amounts[0] = 1;

        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.MINTER_ROLE()
            )
        );
        wbResources.mintBatch(user1, ids, amounts, "");
        vm.stopPrank();
    }

    function test_BurnReducesSupply() public {
        wbResources.mint(user1, 1, 5, "");

        vm.prank(user1);
        wbResources.burn(user1, 1, 2);

        assertEq(wbResources.balanceOf(user1, 1), 3);
        assertEq(wbResources.totalSupply(1), 3);
    }

    function test_PauseAndUnpause() public {
        wbResources.pause();
        assertTrue(wbResources.paused());

        wbResources.unpause();
        assertFalse(wbResources.paused());
    }

    function test_PauseRevertsIfNotPauser() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.PAUSER_ROLE()
            )
        );
        wbResources.pause();
        vm.stopPrank();
    }

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

    function test_SetURIWithRole() public {
        wbResources.grantRole(wbResources.URI_SETTER_ROLE(), address(this));
        string memory newUri = "ipfs://base/{id}";

        wbResources.setURI(0, newUri);

        assertEq(wbResources.uri(0), newUri);
    }

    function test_SetURIWithDifferentURIs() public {
        wbResources.grantRole(wbResources.URI_SETTER_ROLE(), address(this));
        string memory newUri = "ipfs://base/{id}";

        wbResources.setURI(0, newUri);
        console2.log("uri0", wbResources.uri(0));
        console2.log("uri1", wbResources.uri(1));
        assertNotEq(wbResources.uri(0), wbResources.uri(1));
    }

    function test_SetURIRevertsWithoutRole() public {
        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.URI_SETTER_ROLE()
            )
        );
        wbResources.setURI(0, "ipfs://forbidden/{id}");
        vm.stopPrank();
    }

    function test_SupportsInterface() public view {
        assertTrue(wbResources.supportsInterface(type(IERC1155).interfaceId));
        assertTrue(wbResources.supportsInterface(type(IAccessControl).interfaceId));
    }

    function test_UpgradeByUpgrader() public {
        WBResourcesV2Mock v2 = new WBResourcesV2Mock();

        bytes32 IMPLEMENTATION_SLOT =
            bytes32(uint256(0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc));

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

    function test_UpgradeRevertsIfNotUpgrader() public {
        WBResourcesV2Mock v2 = new WBResourcesV2Mock();

        vm.startPrank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                attacker,
                wbResources.UPGRADER_ROLE()
            )
        );
        wbResources.upgradeToAndCall(address(v2), "");
        vm.stopPrank();
    }
}

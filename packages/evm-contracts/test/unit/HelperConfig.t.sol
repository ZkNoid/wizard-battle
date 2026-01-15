// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {HelperConfig} from "script/HelperConfig.s.sol";

contract HelperConfigTest is Test {
    HelperConfig helperConfig;

    function setUp() public {
        helperConfig = new HelperConfig();
    }

    function test_GetConfig() public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        // Verify config is not empty
        assertNotEq(config.defaultAdmin, address(0));
        assertNotEq(config.gameSigner, address(0));
        assertNotEq(config.pauser, address(0));
        assertNotEq(config.minter, address(0));
        assertNotEq(config.upgrader, address(0));
    }

    function test_AnvilConfig() public {
        // Test on Anvil chain (default)
        HelperConfig.NetworkConfig memory config = helperConfig.getOrCreateAnvilEthConfig();

        // Verify Anvil default addresses
        assertEq(config.defaultAdmin, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        assertEq(config.gameSigner, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        assertEq(config.pauser, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        assertEq(config.minter, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        assertEq(config.upgrader, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function test_SepoliaConfig() public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getSepoliaEthConfig();

        // Verify Sepolia addresses are set
        assertEq(config.defaultAdmin, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.gameSigner, 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99);
        assertEq(config.pauser, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.minter, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.upgrader, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
    }

    function test_FujiConfig() public view {
        HelperConfig.NetworkConfig memory config = helperConfig.getFujiAvlConfig();

        // Verify Fuji addresses are set
        assertEq(config.defaultAdmin, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.gameSigner, 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99);
        assertEq(config.pauser, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.minter, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
        assertEq(config.upgrader, 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218);
    }

    function test_ActiveNetworkConfigIsSet() public view {
        // Access the public state variable - it returns all struct fields
        (address defaultAdmin, address gameSigner, address pauser, address minter, address upgrader) = helperConfig.activeNetworkConfig();

        // Verify active config is set (should be Anvil by default in tests)
        assertNotEq(defaultAdmin, address(0));
        assertNotEq(gameSigner, address(0));
        assertNotEq(pauser, address(0));
        assertNotEq(minter, address(0));
        assertNotEq(upgrader, address(0));
    }
}

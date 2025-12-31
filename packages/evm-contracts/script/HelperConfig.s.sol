// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        address defaultAdmin;
        address gameSigner;
        address pauser;
        address minter;
        address upgrader;
    }

    NetworkConfig public activeNetworkConfig;

    constructor() {
        if (block.chainid == 11_155_111) {
            activeNetworkConfig = getSepoliaEthConfig();
        } else if (block.chainid == 43_113) {
            activeNetworkConfig = getFujiAvlConfig();
        } else {
            activeNetworkConfig = getOrCreateAnvilEthConfig();
        }
    }

    function getSepoliaEthConfig() public pure returns (NetworkConfig memory sepoliaConfig) {
        sepoliaConfig = NetworkConfig({
            defaultAdmin: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            gameSigner: 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99, // Game signer address
            pauser: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            minter: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            upgrader: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 // My dev address
        });
    }

    function getFujiAvlConfig() public pure returns (NetworkConfig memory fujiConfig) {
        fujiConfig = NetworkConfig({
            defaultAdmin: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            gameSigner: 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99, // Game signer address
            pauser: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            minter: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218, // My dev address
            upgrader: 0x667c1aBD4E25BE048b8217F90Fc576780CCa8218 // My dev address
        });
    }

    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory anvilConfig) {
        if (activeNetworkConfig.gameSigner != address(0)) {
            return activeNetworkConfig;
        }

        anvilConfig = NetworkConfig({
            defaultAdmin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // My dev address
            gameSigner: 0xB4Ee8D79974f85AA9D298628A37754d1313dAA99, // Game signer address
            pauser: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // My dev address
            minter: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // My dev address
            upgrader: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 // My dev address
        });
    }

    function getConfig() public view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    struct NetworkConfig {
        bytes32 minterRole;
        address gameSigner;
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
        sepoliaConfig = NetworkConfig({minterRole: keccak256("MINTER_ROLE"), gameSigner: 0x1234567890123456789012345678901234567890});
    }

    function getFujiAvlConfig() public pure returns (NetworkConfig memory fujiConfig) {
        fujiConfig = NetworkConfig({minterRole: keccak256("MINTER_ROLE"), gameSigner: 0x1234567890123456789012345678901234567890});
    }

    function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory anvilConfig) {
        if (activeNetworkConfig.gameSigner != address(0)) {
            return activeNetworkConfig;
        }

        anvilConfig = NetworkConfig({minterRole: keccak256("MINTER_ROLE"), gameSigner: 0x1234567890123456789012345678901234567890});
    }

    function getConfig() public view returns (NetworkConfig memory) {
        return activeNetworkConfig;
    }
}

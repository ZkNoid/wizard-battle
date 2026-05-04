// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {GameMarket} from "../src/GameMarket.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployGameMarket is Script {
    HelperConfig helperConfig;
    HelperConfig.NetworkConfig config;

    function run() public returns (address proxyGameMarket) {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        proxyGameMarket = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        GameMarket gameMarket = new GameMarket();
        ERC1967Proxy proxy = new ERC1967Proxy(address(gameMarket), abi.encodeCall(gameMarket.initialize, (3000, address(0))));
        vm.stopBroadcast();
        return address(proxy);
    }
}

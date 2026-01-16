// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {GameRegistry} from "../src/GameRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployGameRegistry is Script {
    string[] coins;
    string[] characters;
    string[] resources;

    function run() public returns (address proxyGameRegistry) {
        proxyGameRegistry = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        GameRegistry gameRegistry = new GameRegistry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(gameRegistry), abi.encodeCall(gameRegistry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), msg.sender))
        );
        vm.stopBroadcast();
        return address(proxy);
    }
}

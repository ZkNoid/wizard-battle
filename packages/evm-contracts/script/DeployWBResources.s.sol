// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBResources} from "../src/tokens/ERC1155/WBResources.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployWBResources is Script {
    function run() public returns (address proxyWbResources) {
        proxyWbResources = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        WBResources wbResources = new WBResources();
        ERC1967Proxy proxy = new ERC1967Proxy(address(wbResources), abi.encodeCall(wbResources.initialize, (msg.sender, msg.sender, msg.sender, msg.sender)));
        vm.stopBroadcast();
        return address(proxy);
    }
}

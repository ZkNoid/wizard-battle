// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBItems} from "../src/tokens/ERC721/WBItems.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployWBItems is Script {
    function run() public returns (address proxyWBItems) {
        proxyWBItems = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        WBItems wbItems = new WBItems();
        ERC1967Proxy proxy = new ERC1967Proxy(address(wbItems), abi.encodeCall(wbItems.initialize, (msg.sender, msg.sender, msg.sender, msg.sender)));
        vm.stopBroadcast();
        return address(proxy);
    }
}

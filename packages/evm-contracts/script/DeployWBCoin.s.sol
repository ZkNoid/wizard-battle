// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBCoin} from "../src/tokens/ERC20/WBCoin.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployWBCoin is Script {
    function run() public returns (address proxyWBCoin) {
        (proxyWBCoin) = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        WBCoin wBCoin = new WBCoin();
        ERC1967Proxy proxy = new ERC1967Proxy(address(wBCoin), abi.encodeCall(wBCoin.initialize, (msg.sender, msg.sender, msg.sender, msg.sender)));
        vm.stopBroadcast();
        return (address(proxy));
    }
}

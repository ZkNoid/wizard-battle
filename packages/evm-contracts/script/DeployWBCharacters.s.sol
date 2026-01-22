// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBCharacters} from "../src/tokens/ERC721/WBCharacters.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployWBCharacters is Script {
    function run() public returns (address proxyWbCharacters) {
        proxyWbCharacters = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        WBCharacters wbCharacters = new WBCharacters();
        ERC1967Proxy proxy = new ERC1967Proxy(address(wbCharacters), abi.encodeCall(wbCharacters.initialize, (msg.sender, msg.sender, msg.sender, msg.sender)));
        vm.stopBroadcast();
        return address(proxy);
    }
}

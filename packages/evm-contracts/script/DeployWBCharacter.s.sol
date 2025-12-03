// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBCharacter} from "../src/tokens/ERC721/WBCharacter.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployWBCharacter is Script {
    function run() public returns (address proxyWbCharacter) {
        proxyWbCharacter = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        WBCharacter wbCharacter = new WBCharacter();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(wbCharacter),
            abi.encodeCall(wbCharacter.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))
        );
        vm.stopBroadcast();
        return address(proxy);
    }
}

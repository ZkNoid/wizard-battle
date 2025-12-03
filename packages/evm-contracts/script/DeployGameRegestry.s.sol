// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {GameRegestry} from "../src/GameRegestry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployGameRegestry is Script {
    function run() public returns (address proxyGameRegestry) {
        proxyGameRegestry = deploy();
    }

    function deploy() public returns (address) {
        vm.startBroadcast();
        GameRegestry gameRegestry = new GameRegestry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(gameRegestry),
            abi.encodeCall(gameRegestry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), msg.sender))
        );
        vm.stopBroadcast();
        return address(proxy);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {GameMarket} from "../src/GameMarket.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UpgradeGameMarket is Script {
    address public constant PROXY = 0x8865d8738E37671138D5270A7B4befeE83DeE904;

    function run() public returns (address newImplementation) {
        newImplementation = upgrade(PROXY);
    }

    function upgrade(address proxy) public returns (address newImplementation) {
        vm.startBroadcast();
        GameMarket newImpl = new GameMarket();
        UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();
        newImplementation = address(newImpl);
    }
}

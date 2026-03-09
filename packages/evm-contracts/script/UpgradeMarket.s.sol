// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {GameMarket} from "../src/GameMarket.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UpgradeGameMarket is Script {
    address public constant PROXY = 0xdf767a5d5D14c60e5C31fDBD839106AA6dAe34F8;

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

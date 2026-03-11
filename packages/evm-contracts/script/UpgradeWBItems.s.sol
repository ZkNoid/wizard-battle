// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBItems} from "src/tokens/ERC721/WBItems.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {DevOpsTools} from "foundry-devops/DevOpsTools.sol";

contract UpgradeWBItems is Script {
    address public constant PROXY = 0x6fC43f3cf1B27199F52F160f05645b1541292484;

    function run() public returns (address newImplementation) {
        //address proxy = DevOpsTools.get_most_recent_deployment("WBItems", block.chainid);
        newImplementation = upgrade(PROXY);
    }

    function upgrade(address proxy) public returns (address newImplementation) {
        vm.startBroadcast();
        WBItems newImpl = new WBItems();
        UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();
        newImplementation = address(newImpl);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {DevOpsTools} from "foundry-devops/DevOpsTools.sol";

contract UpgradeWBResources is Script {
    address public constant PROXY = 0xee52Ce7D2c46F8B728D74a030efCB78885F90E25;

    function run() public returns (address newImplementation) {
        //address proxy = DevOpsTools.get_most_recent_deployment("WBItems", block.chainid);
        newImplementation = upgrade(PROXY);
    }

    function upgrade(address proxy) public returns (address newImplementation) {
        vm.startBroadcast();
        WBResources newImpl = new WBResources();
        UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();
        newImplementation = address(newImpl);
    }
}

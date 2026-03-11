// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {WBCharacters} from "src/tokens/ERC721/WBCharacters.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {DevOpsTools} from "foundry-devops/DevOpsTools.sol";

contract UpgradeWBCharacters is Script {
    address public constant PROXY = 0x55e1cCD651A3e3e0EfC6b61e8c94878cbe87F64B;

    function run() public returns (address newImplementation) {
        //address proxy = DevOpsTools.get_most_recent_deployment("WBCharacters", block.chainid);
        newImplementation = upgrade(PROXY);
    }

    function upgrade(address proxy) public returns (address newImplementation) {
        vm.startBroadcast();
        WBCharacters newImpl = new WBCharacters();
        UUPSUpgradeable(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();
        newImplementation = address(newImpl);
    }
}

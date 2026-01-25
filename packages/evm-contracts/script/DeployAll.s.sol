// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import {Script} from "forge-std/Script.sol";
import {GameRegistry} from "../src/GameRegistry.sol";
import {WBCharacters} from "../src/tokens/ERC721/WBCharacters.sol";
import {WBItems} from "../src/tokens/ERC721/WBItems.sol";
import {WBResources} from "../src/tokens/ERC1155/WBResources.sol";
import {WBCoin} from "../src/tokens/ERC20/WBCoin.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployAll is Script {
    HelperConfig helperConfig;
    HelperConfig.NetworkConfig config;

    function run() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();

        deploy();
    }

    function _deployGameRegistry() internal returns (address gameRegistry) {
        vm.startBroadcast();
        // Deploy GameRegistry
        gameRegistry = address(
            new ERC1967Proxy(
                address(new GameRegistry()),
                abi.encodeCall(GameRegistry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), config.gameSigner))
            )
        );
        vm.stopBroadcast();
    }

    function _deployWBCharacters() internal returns (address wbCharacters) {
        vm.startBroadcast();
        // Deploy WBCharacters
        wbCharacters =
            address(new ERC1967Proxy(address(new WBCharacters()), abi.encodeCall(WBCharacters.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
        vm.stopBroadcast();
    }

    function _deployWBResources() internal returns (address wbResources) {
        vm.startBroadcast();
        // Deploy WBResources
        wbResources =
            address(new ERC1967Proxy(address(new WBResources()), abi.encodeCall(WBResources.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
        vm.stopBroadcast();
    }

    function _deployWBItems() internal returns (address wbItems) {
        vm.startBroadcast();
        // Deploy WBItems
        wbItems = address(new ERC1967Proxy(address(new WBItems()), abi.encodeCall(WBItems.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
        vm.stopBroadcast();
    }

    function _deployWBCoin() internal returns (address wbCoin) {
        vm.startBroadcast();
        // Deploy WBCoin
        wbCoin = address(new ERC1967Proxy(address(new WBCoin()), abi.encodeCall(WBCoin.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
        vm.stopBroadcast();
    }

    function deploy() public {
        vm.startBroadcast();

        address gameRegistry = address(
            new ERC1967Proxy(
                address(new GameRegistry()),
                abi.encodeCall(GameRegistry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), config.gameSigner))
            )
        );

        address wbCharacters =
            address(new ERC1967Proxy(address(new WBCharacters()), abi.encodeCall(WBCharacters.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        address wbResources =
            address(new ERC1967Proxy(address(new WBResources()), abi.encodeCall(WBResources.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        address wbCoin = address(new ERC1967Proxy(address(new WBCoin()), abi.encodeCall(WBCoin.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        address wbItems =
            address(new ERC1967Proxy(address(new WBItems()), abi.encodeCall(WBItems.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        WBCharacters(wbCharacters).grantRole(keccak256("MINTER_ROLE"), gameRegistry);
        WBCharacters(wbCharacters).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        WBResources(wbResources).grantRole(keccak256("MINTER_ROLE"), gameRegistry);
        WBResources(wbResources).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        WBCoin(wbCoin).grantRole(keccak256("MINTER_ROLE"), gameRegistry);
        WBCoin(wbCoin).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        WBItems(wbItems).grantRole(keccak256("MINTER_ROLE"), gameRegistry);
        WBItems(wbItems).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        vm.stopBroadcast();
    }
}

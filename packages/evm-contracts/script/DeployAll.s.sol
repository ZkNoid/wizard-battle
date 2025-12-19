// SPDX-license-Identifier: MIT
pragma solidity ^0.8.27;
import {Script} from "forge-std/Script.sol";
import {GameRegestry} from "../src/GameRegestry.sol";
import {WBCharacter} from "../src/tokens/ERC721/WBCharacter.sol";
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

    function _deployGameRegestry() internal returns (address gameRegestry) {
        vm.startBroadcast();
        // Deploy GameRegestry
        gameRegestry = address(
            new ERC1967Proxy(
                address(new GameRegestry()),
                abi.encodeCall(GameRegestry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), config.gameSigner))
            )
        );
        vm.stopBroadcast();
    }

    function _deployWBCharacter() internal returns (address wbCharacter) {
        vm.startBroadcast();
        // Deploy WBCharacter
        wbCharacter =
            address(new ERC1967Proxy(address(new WBCharacter()), abi.encodeCall(WBCharacter.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
        vm.stopBroadcast();
    }

    function _deployWBResources() internal returns (address wbResources) {
        vm.startBroadcast();
        // Deploy WBResources
        wbResources =
            address(new ERC1967Proxy(address(new WBResources()), abi.encodeCall(WBResources.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));
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

        address gameRegestry = address(
            new ERC1967Proxy(
                address(new GameRegestry()),
                abi.encodeCall(GameRegestry.initialize, (new string[](0), new string[](0), new string[](0), new string[](0), config.gameSigner))
            )
        );

        address wbCharacter =
            address(new ERC1967Proxy(address(new WBCharacter()), abi.encodeCall(WBCharacter.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        address wbResources =
            address(new ERC1967Proxy(address(new WBResources()), abi.encodeCall(WBResources.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        address wbCoin = address(new ERC1967Proxy(address(new WBCoin()), abi.encodeCall(WBCoin.initialize, (msg.sender, msg.sender, msg.sender, msg.sender))));

        WBCoin(wbCoin).grantRole(keccak256("MINTER_ROLE"), gameRegestry);
        WBCoin(wbCoin).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        WBCharacter(wbCharacter).grantRole(keccak256("MINTER_ROLE"), gameRegestry);
        WBCharacter(wbCharacter).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        WBResources(wbResources).grantRole(keccak256("MINTER_ROLE"), gameRegestry);
        WBResources(wbResources).grantRole(keccak256("MINTER_ROLE"), config.gameSigner);

        vm.stopBroadcast();
    }
}

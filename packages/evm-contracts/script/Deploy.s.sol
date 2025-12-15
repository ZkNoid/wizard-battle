//SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import {Script} from "forge-std/Script.sol";
import {GameRegestry} from "../src/GameRegestry.sol";
import {WBCoin} from "../src/tokens/ERC20/WBCoin.sol";
import {WBCharacter} from "../src/tokens/ERC721/WBCharacter.sol";
import {WBResources} from "../src/tokens/ERC1155/WBResources.sol";
import {DeployWBCoin} from "./DeployWBCoin.s.sol";
import {DeployWBCharacter} from "./DeployWBCharacter.s.sol";
import {DeployWBResources} from "./DeployWBResources.s.sol";
import {DeployGameRegestry} from "./DeployGameRegestry.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract Deploy is Script {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address public constant GAME_SIGNER = 0x1234567890123456789012345678901234567890; // replace with actual game signer address

    function run() public {
        deploy();
    }

    function deploy() public {
        vm.startBroadcast(msg.sender);

        DeployWBCoin wbCoinDeployer = new DeployWBCoin();
        DeployWBCharacter wbCharacterDeployer = new DeployWBCharacter();
        DeployWBResources wbResourcesDeployer = new DeployWBResources();
        DeployGameRegestry gameRegestryDeployer = new DeployGameRegestry();

        address wBCoin = wbCoinDeployer.deploy();
        address wbCharacter = wbCharacterDeployer.deploy();
        address wbResources = wbResourcesDeployer.deploy();
        address gameRegestry = gameRegestryDeployer.deploy();

        WBCoin(wBCoin).grantRole(MINTER_ROLE, gameRegestry);
        WBCoin(wBCoin).grantRole(MINTER_ROLE, GAME_SIGNER);

        WBResources(wbResources).grantRole(MINTER_ROLE, gameRegestry);
        WBResources(wbResources).grantRole(MINTER_ROLE, GAME_SIGNER);

        WBCharacter(wbCharacter).grantRole(MINTER_ROLE, gameRegestry);
        WBCharacter(wbCharacter).grantRole(MINTER_ROLE, GAME_SIGNER);

        vm.stopBroadcast();
    }
}

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
import {HelperConfig} from "./HelperConfig.s.sol";

contract Deploy is Script {
    DeployWBCoin wbCoinDeployer;
    DeployWBCharacter wbCharacterDeployer;
    DeployWBResources wbResourcesDeployer;
    DeployGameRegestry gameRegestryDeployer;
    HelperConfig helperConfig;

    function run() public {
        deploy();
    }

    function deploy() public {
        helperConfig = new HelperConfig();
        wbCoinDeployer = new DeployWBCoin();
        wbCharacterDeployer = new DeployWBCharacter();
        wbResourcesDeployer = new DeployWBResources();
        gameRegestryDeployer = new DeployGameRegestry();

        HelperConfig.NetworkConfig memory networkConfig = helperConfig.getConfig();

        address gameRegestry = gameRegestryDeployer.deploy();
        address wBCoin = wbCoinDeployer.deploy();
        address wbCharacter = wbCharacterDeployer.deploy();
        address wbResources = wbResourcesDeployer.deploy();

        WBCoin(wBCoin).grantRole(networkConfig.minterRole, gameRegestry);
        WBCoin(wBCoin).grantRole(networkConfig.minterRole, networkConfig.gameSigner);

        WBResources(wbResources).grantRole(networkConfig.minterRole, gameRegestry);
        WBResources(wbResources).grantRole(networkConfig.minterRole, networkConfig.gameSigner);
        WBCharacter(wbCharacter).grantRole(networkConfig.minterRole, gameRegestry);
        WBCharacter(wbCharacter).grantRole(networkConfig.minterRole, networkConfig.gameSigner);
    }
}

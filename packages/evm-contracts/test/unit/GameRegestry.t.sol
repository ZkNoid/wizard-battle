// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";

contract GameRegestryTest is Test {
    GameRegestry public gameRegestry;

    function setUp() public {
        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);
    }

    function test_setUp() public pure {
        assert(true);
    }

    /*//////////////////////////////////////////////////////////////
                             GAME FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_addGameElement() public {}
    function test_removeGameElement() public {}
    function test_commitResources() public {}

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function test_grantRole() public {}
    function test_revokeRole() public {}
    function test_revokeAdminRole() public {}
    function test_grantAdminRole() public {}
    function test_renounceAdminRole() public {}

    /*//////////////////////////////////////////////////////////////
                             GET FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function test_getGameElement() public {}
    function test_getGameCoinsList() public {}
    function test_getResourcesList() public {}
    function test_getCharactersList() public {}
    function test_getUniqueItemsList() public {}
}

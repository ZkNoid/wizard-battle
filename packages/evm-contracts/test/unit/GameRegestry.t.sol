// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";

contract GameRegestryTest is Test {
    GameRegestry public gameRegestry;

    function setUp() public {
        //(string[] memory _coins, string[] memory _resources, string[] memory _characters, string[] memory _uiniqueItems, address _gameSigner
        gameRegestry = new GameRegestry(new string[](0), new string[](0), new string[](0), new string[](0), address(0));
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
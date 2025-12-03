// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {WBCharacter} from "../../src/tokens/ERC721/WBCharacter.sol";
import {DeployWBCharacter} from "../../script/DeployWBCharacter.s.sol";

contract WBCharacterTest is Test {
    WBCharacter public wbCharacter;

    function setUp() public {
        address wbCharacterAddress = new DeployWBCharacter().deploy();
        wbCharacter = WBCharacter(wbCharacterAddress);
    }

    function test_setUp() public pure {
        assert(true);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {WBResources} from "../../src/tokens/ERC1155/WBResources.sol";
import {DeployWBResources} from "../../script/DeployWBResources.s.sol";

contract WBResourcesTest is Test {
    WBResources public wbResources;

    function setUp() public {
        address wbResourcesAddress = new DeployWBResources().deploy();
        wbResources = WBResources(wbResourcesAddress);

    }

    function test_setUp() public pure {
        assert(true);
    }
}

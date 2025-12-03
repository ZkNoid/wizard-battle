// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {WBCoin} from "../../src/tokens/ERC20/WBCoin.sol";
import {DeployWBCoin} from "../../script/DeployWbCoin.s.sol";
contract WBCoinTest is Test {
    WBCoin public wbCoin;

    function setUp() public {
        address wbCoinAddress = new DeployWBCoin().deploy();
        wbCoin = WBCoin(wbCoinAddress);
    }

    function test_setUp() public pure {
        assert(true);
    }
}

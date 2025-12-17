// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBCoin} from "../../src/tokens/ERC20/WBCoin.sol";

contract WBCoinV2Mock is WBCoin {
    uint256 public version = 2;

    function newFunction() external pure returns (string memory) {
        return "Upgraded!";
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBItems} from "../../src/tokens/ERC721/WBItems.sol";

contract WBItemsV2Mock is WBItems {
    uint256 public version = 2;

    function newFunction() external pure returns (string memory) {
        return "Upgraded!";
    }
}


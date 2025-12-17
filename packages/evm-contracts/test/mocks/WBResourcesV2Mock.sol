// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBResources} from "../../src/tokens/ERC1155/WBResources.sol";

contract WBResourcesV2Mock is WBResources {
    uint256 public version = 2;

    function newFunction() external pure returns (string memory) {
        return "Upgraded!";
    }
}


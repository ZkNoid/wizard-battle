// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBCharacters} from "../../src/tokens/ERC721/WBCharacters.sol";

contract WBCharactersV2Mock is WBCharacters {
    uint256 public version = 2;

    function newFunction() external pure returns (string memory) {
        return "Upgraded!";
    }
}


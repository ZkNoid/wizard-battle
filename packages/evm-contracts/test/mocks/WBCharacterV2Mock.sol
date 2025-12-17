// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBCharacter} from "../../src/tokens/ERC721/WBCharacter.sol";

contract WBCharacterV2Mock is WBCharacter {
    uint256 public version = 2;

    function newFunction() external pure returns (string memory) {
        return "Upgraded!";
    }
}


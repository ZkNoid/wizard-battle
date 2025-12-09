// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {WBCharacter} from "../../src/tokens/ERC721/WBCharacter.sol";
import {
    ERC721EnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

// This contract is used to test internal functions
// It inherits from WBCharacter and exposes _increaseBalance for testing
contract WBCharacterTestHelper is WBCharacter {
    // Override constructor to allow initialization
    constructor() {
        // Don't call _disableInitializers() so we can initialize
    }

    /// @notice Helper to exercise _increaseBalance function for coverage
    /// @dev ERC721Enumerable only allows value == 0 (no batch minting)
    /// @param account The account to increase balance for
    /// @param value Must be 0 (ERC721Enumerable prevents batch minting)
    function exposeIncreaseBalance(address account, uint128 value) external {
        // ERC721Enumerable prevents batch minting (amount > 0)
        // This check matches ERC721Enumerable's behavior and is expected to revert for value > 0
        require(value == 0, "ERC721EnumerableForbiddenBatchMint");
        // This will call ERC721Enumerable's _increaseBalance, which calls super._increaseBalance
        // which will call WBCharacter's _increaseBalance override
        _increaseBalance(account, value);
    }
}


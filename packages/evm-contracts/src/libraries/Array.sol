// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title Array
 * @author Alexander Scherbatyuk
 * @notice Library for array operations
 */

// TODO: take a closer look, might not be gas efficient
library Array {
    error Array__ArrayIsEmpty();
    error Array__IndexOutOfBounds();

    function removeByIndex(string[] storage arr, uint256 index) internal {
        if (arr.length == 0) revert Array__ArrayIsEmpty();
        if (index >= arr.length) revert Array__IndexOutOfBounds(); // ← critical!

        arr[index] = arr[arr.length - 1];
        arr.pop();
    }
}

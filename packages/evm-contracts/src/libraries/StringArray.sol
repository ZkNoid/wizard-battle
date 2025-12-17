// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title Array
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Library for array operations
 */
library StringArray {
    error StringArray__ArrayIsEmpty();
    error StringArray__IndexOutOfBounds();

    function removeByIndex(string[] storage arr, uint256 index) internal {
        if (arr.length == 0) revert StringArray__ArrayIsEmpty();
        if (index >= arr.length) revert StringArray__IndexOutOfBounds(); // ← critical!

        arr[index] = arr[arr.length - 1];
        arr.pop();
    }
}

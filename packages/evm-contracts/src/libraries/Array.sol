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

    function removeByIndex(string[] storage array, uint256 index) internal {
        if (array.length == 0) {
            revert Array__ArrayIsEmpty();
        }

        if (array.length > 1) {
            array[index] = array[array.length - 1];
        }
        array.pop();
    }
}

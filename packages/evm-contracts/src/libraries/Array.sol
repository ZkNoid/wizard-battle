// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title Array
 * @author Alexander Scherbatyuk
 * @notice Library for array operations
 */
library Array {
    function removeByIndex(string[] storage array, uint256 index) internal {
        array[index] = array[array.length - 1];
        array.pop();
    }
}

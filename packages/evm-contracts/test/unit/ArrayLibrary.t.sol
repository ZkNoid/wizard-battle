// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Array} from "src/libraries/Array.sol";
import {Test, console} from "forge-std/Test.sol";

contract ArrayLibraryTest is Test {
    error Array__ArrayIsEmpty();
    error Array__IndexOutOfBounds();

    using Array for string[];

    string[] stringArray;

    function setUp() public {}

    function test_removeByIndex() public {
        stringArray.push(string(abi.encodePacked("name_", uint64(0))));
        stringArray.removeByIndex(0);
        assertEq(stringArray.length, 0);
    }

    function test_removeByIndexOutOfBounds() public {
        stringArray.push("name_0");
        vm.expectRevert(Array__IndexOutOfBounds.selector);
        stringArray.removeByIndex(1);
    }

    function test_removeByIndexZeroLength() public {
        vm.expectRevert(Array__ArrayIsEmpty.selector);
        stringArray.removeByIndex(0);
    }

    function testFuzz_removeByIndex(uint256 index) public {
        index = bound(index, 0, 100);

        for (uint256 i; i <= index + 1; ++i) {
            stringArray.push(string(abi.encodePacked("name_", uint64(i))));
        }

        stringArray.removeByIndex(index);
        assertEq(stringArray.length, index + 1);
    }
}

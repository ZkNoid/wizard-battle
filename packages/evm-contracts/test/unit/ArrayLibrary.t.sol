// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {StringArray} from "src/libraries/StringArray.sol";
import {Test, console} from "forge-std/Test.sol";

contract ArrayLibraryTest is Test {
    error StringArray__ArrayIsEmpty();
    error StringArray__IndexOutOfBounds();

    using StringArray for string[];

    string[] stringArray;

    function setUp() public {}

    function test_removeByIndex() public {
        stringArray.push(string(abi.encodePacked("name_", uint64(0))));
        stringArray.removeByIndex(0);
        assertEq(stringArray.length, 0);
    }

    function test_removeByIndexOutOfBounds() public {
        stringArray.push("name_0");
        vm.expectRevert(StringArray__IndexOutOfBounds.selector);
        stringArray.removeByIndex(1);
    }

    function test_removeByIndexZeroLength() public {
        vm.expectRevert(StringArray__ArrayIsEmpty.selector);
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

library Array {
    function removeByIndex(string[] storage array, uint256 index) internal {
        array[index] = array[array.length - 1];
        array.pop();
    }
}
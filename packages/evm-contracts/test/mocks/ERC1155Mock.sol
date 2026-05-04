// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Mock is ERC1155 {
    constructor() ERC1155("") {}

    function mint(address account, uint256 id, uint256 amount, bytes memory data) external {
        _mint(account, id, amount, data);
    }

    function mintBatch(address account, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external {
        _mintBatch(account, ids, amounts, data);
    }

    function burn(address account, uint256 id, uint256 amount) external {
        _burn(account, id, amount);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) external {
        _burnBatch(account, ids, amounts);
    }
}

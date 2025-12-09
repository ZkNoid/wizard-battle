// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";
import {DeployWBResources} from "script/DeployWBResources.s.sol";

contract GameRegestryIntTest is Test {
    event CommitResources(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(
        bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId
    );
    event RemoveGameElement(bytes32 indexed nameHash);

    GameRegestry public gameRegestry;
    WBResources public wbResources;

    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");

    address public GAME_SIGNER;
    address public ADMIN;

    function setUp() public {
        address wbResourcesAddress = new DeployWBResources().deploy();
        wbResources = WBResources(wbResourcesAddress);

        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegestry.renounceRole(GAME_SIGNER_ROLE, address(this));

        ADMIN = msg.sender;
        GAME_SIGNER = makeAddr("GAME_SIGNER");

        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE, GAME_SIGNER);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";

contract GameRegestryTest is Test {
    
    event CommitResources(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(
        bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId
    );
    event RemoveGameElement( bytes32 indexed nameHash);

    GameRegestry public gameRegestry;

    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");

    address public GAME_SIGNER;
    address public ADMIN;

    function setUp() public {
        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegestry.renounceRole(GAME_SIGNER_ROLE,address(this));

        ADMIN = msg.sender;
        GAME_SIGNER = makeAddr("GAME_SIGNER");


        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE,GAME_SIGNER);

    }

    function test_setUp() public pure {
        assert(true);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/



    /*//////////////////////////////////////////////////////////////
                             ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    function test_userHasGameSignerRole() public view {
        assertTrue(gameRegestry.hasRole(GAME_SIGNER_ROLE,GAME_SIGNER), "Game Signer has a GAME_SIGNER_ROLE");
    }


    /*//////////////////////////////////////////////////////////////
                      GAME FUNCTIONS UNAUTHORIZED
    //////////////////////////////////////////////////////////////*/

    function test_addGameElementByNonGameSigner() public {
        string memory RESOURCE_NAME = "coal";
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.expectRevert(GameRegestry.GameRegestry__OnlyGameSignerRole.selector);

        gameRegestry.addGameElement(
            {
                elementType: GameRegestry.GameElementType.RESOURCE,
                name: RESOURCE_NAME,
                elementTokenAddress: tokenAddress,
                elementTokenId: elementTokenId,
                elementHasTokenId: elementHasTokenId
            }
        );
    }

    function test_removeGameElementByNonGameSigner() public {
        string memory ELEMENT_NAME = "coal";
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, true, true);
        emit AddGameElement(keccak256(bytes(ELEMENT_NAME)),tokenAddress,elementTokenId,elementHasTokenId);

        gameRegestry.addGameElement(
            {
                elementType: GameRegestry.GameElementType.RESOURCE,
                name: ELEMENT_NAME,
                elementTokenAddress: tokenAddress,
                elementTokenId: elementTokenId,
                elementHasTokenId: elementHasTokenId
            }
        );
        
        // prank Game Signer and resource
        string[] memory ALL_ELEMENTS = gameRegestry.getResourcesList();
        uint256 ELEMENT_NAME_INDEX;

        // search for added element
        for (uint256 i; i < ALL_ELEMENTS.length;){

            if (keccak256(bytes(ALL_ELEMENTS[i])) == keccak256(bytes(ELEMENT_NAME))) {
                 ELEMENT_NAME_INDEX = i;
                 break;
            }

            unchecked {
                ++i;
            }
        }

        // remove added element
        vm.expectRevert(GameRegestry.GameRegestry__OnlyGameSignerRole.selector);
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE,ELEMENT_NAME_INDEX);
    }

    /*//////////////////////////////////////////////////////////////
                       GAME FUNCTIONS AUTHORIZED
    //////////////////////////////////////////////////////////////*/

    function test_addGameElementByGameSigner() public {
        string memory RESOURCE_NAME = "coal";
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, true, true);
        emit AddGameElement(keccak256(bytes(RESOURCE_NAME)),tokenAddress,elementTokenId,elementHasTokenId);

        gameRegestry.addGameElement(
            {
                elementType: GameRegestry.GameElementType.RESOURCE,
                name: RESOURCE_NAME,
                elementTokenAddress: tokenAddress,
                elementTokenId: elementTokenId,
                elementHasTokenId: elementHasTokenId
            }
        );
    }

     function test_removeGameElementByGameSigner() public {
        string memory ELEMENT_NAME = "coal";
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.startPrank(GAME_SIGNER);
        vm.expectEmit(true, true, true, true);
        emit AddGameElement(keccak256(bytes(ELEMENT_NAME)),tokenAddress,elementTokenId,elementHasTokenId);

        gameRegestry.addGameElement(
            {
                elementType: GameRegestry.GameElementType.RESOURCE,
                name: ELEMENT_NAME,
                elementTokenAddress: tokenAddress,
                elementTokenId: elementTokenId,
                elementHasTokenId: elementHasTokenId
            }
        );

        vm.expectEmit(true, true, false, false);
        emit RemoveGameElement(keccak256(bytes(ELEMENT_NAME)));
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE,0);
        vm.stopPrank();
    }

    function test_commitResources() public {}

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function test_grantRole() public {}
    function test_revokeRole() public {}
    function test_revokeAdminRole() public {}
    function test_grantAdminRole() public {}
    function test_renounceAdminRole() public {}

    /*//////////////////////////////////////////////////////////////
                             GET FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function test_getGameElement() public {

       // GameElementStruct gameElementStruct = gameRegestry.getGameElement()
    }
    function test_getGameCoinsList() public {}
    function test_getResourcesList() public {}
    function test_getCharactersList() public {}
    function test_getUniqueItemsList() public {}
}

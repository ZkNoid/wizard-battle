// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";
//import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

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

    uint256 public GAME_SIGNER_PRIV_KEY;

    function setUp() public {

        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegestry.renounceRole(GAME_SIGNER_ROLE,address(this));

        ADMIN = msg.sender;
        (GAME_SIGNER, GAME_SIGNER_PRIV_KEY) = makeAddrAndKey("GAME_SIGNER");


        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE,GAME_SIGNER);



    }

    function test_setUp() public pure {
        assert(true);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier addGameElement() {
        string memory ELEMENT_NAME = "coal";
        address tokenAddress = address(gameRegestry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement(
            {
                elementType: GameRegestry.GameElementType.RESOURCE,
                name: ELEMENT_NAME,
                elementTokenAddress: tokenAddress,
                elementTokenId: elementTokenId,
                elementHasTokenId: elementHasTokenId
            }
        );

        _;
    }


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

    function test_removeGameElementByNonGameSigner() public addGameElement {
        string memory ELEMENT_NAME = "coal";
        
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

     function test_removeGameElementByGameSigner() public addGameElement {
        string memory ELEMENT_NAME = "coal";

        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, false, false);
        emit RemoveGameElement(keccak256(bytes(ELEMENT_NAME)));
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE,0);
    }

    function test_commitResource() public addGameElement {

        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)",1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);


        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource(
            {
                resourceHash: resourceHash, 
                commit: commit, 
                signature: signature
            }
        );
    }

    function test_commitBatch() public addGameElement {
        uint256 nonce = 0;
        bytes[] memory batch = new bytes[](2);
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)",1);

        bytes32 resourceHash;
        bytes memory commit;
        bytes memory signature;

        nonce = 0;
        (resourceHash, commit, signature) = getSignedMessage(nonce, callData);
        batch[0] = abi.encode(resourceHash, commit, signature);

        nonce += 1;
        (resourceHash, commit, signature) = getSignedMessage(nonce, callData);
        batch[1] = abi.encode(resourceHash, commit, signature);

        nonce += 1;
        gameRegestry.commitBatch(nonce, batch);
    }
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

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData)
        public
        view
        returns (bytes32 digest)
    {
        bytes32 MESSAGE_TYPEHASH =
        keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");

        bytes32  TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

        bytes32 _hashedName = keccak256(bytes("GameRegestry"));
        bytes32 _hashedVersion = keccak256(bytes("1"));

        bytes32 hashStruct = keccak256(
            abi.encode(
                MESSAGE_TYPEHASH,
                GameRegestry.CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData})
            )
        );

        bytes32 domainSeparatorV4 = keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(gameRegestry)));
        return MessageHashUtils.toTypedDataHash(domainSeparatorV4, hashStruct);
    }

    function getSignedMessage(uint256 nonce, bytes memory callData) public  returns(bytes32, bytes memory, bytes memory){
        string memory ELEMENT_NAME = "coal";

        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        //bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)",1);

        address target = address(gameRegestry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;

        bytes memory commit = abi.encode(target,account,signer,nonce,callData);

        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r,s,v);

        return (resourceHash, commit, signature);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";
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
    event RemoveGameElement(bytes32 indexed nameHash);

    GameRegestry public gameRegestry;

    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;

    address public GAME_SIGNER;
    address public ADMIN;

    uint256 public GAME_SIGNER_PRIV_KEY;

    string constant ELEMENT_NAME = "coal";
    string constant COIN_NAME = "coin";
    string constant CHARCTER = "wizard";
    string constant UNIQUE_ITEM = "boots";

    function setUp() public {
        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegestry.renounceRole(GAME_SIGNER_ROLE, address(this));

        ADMIN = msg.sender;
        (GAME_SIGNER, GAME_SIGNER_PRIV_KEY) = makeAddrAndKey("GAME_SIGNER");

        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE, GAME_SIGNER);
    }

    function test_setUp() public pure {
        assert(true);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier addGameElement() {
        address tokenAddress = address(gameRegestry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: ELEMENT_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameCoin() {
        address tokenAddress = address(gameRegestry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.COIN,
            name: COIN_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameCharacter() {
        address tokenAddress = address(gameRegestry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.CHARACTER,
            name: CHARCTER,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameUniqueItem() {
        address tokenAddress = address(gameRegestry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.UNIQUE_ITEM,
            name: UNIQUE_ITEM,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    /*//////////////////////////////////////////////////////////////
                             ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    function test_userHasGameSignerRole() public view {
        assertTrue(gameRegestry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "Game Signer should have a GAME_SIGNER_ROLE");
    }

    /*//////////////////////////////////////////////////////////////
                      GAME FUNCTIONS UNAUTHORIZED
    //////////////////////////////////////////////////////////////*/

    function test_addGameElementByNonGameSigner() public {
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.expectRevert(GameRegestry.GameRegestry__OnlyGameSignerRole.selector);

        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: ELEMENT_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });
    }

    function test_removeGameElementByNonGameSigner() public addGameElement {
        // prank Game Signer and resource
        string[] memory ALL_ELEMENTS = gameRegestry.getResourcesList();
        uint256 ELEMENT_NAME_INDEX;

        // search for added element
        for (uint256 i; i < ALL_ELEMENTS.length;) {
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
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE, ELEMENT_NAME_INDEX);
    }

    /*//////////////////////////////////////////////////////////////
                       GAME FUNCTIONS AUTHORIZED
    //////////////////////////////////////////////////////////////*/

    function test_addGameElementByGameSigner() public {
        address tokenAddress = address(1);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, true, true);
        emit AddGameElement(keccak256(bytes(ELEMENT_NAME)), tokenAddress, elementTokenId, elementHasTokenId);

        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: ELEMENT_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });
    }

    function test_removeGameElementByGameSigner() public addGameElement {
        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, false, false);
        emit RemoveGameElement(keccak256(bytes(ELEMENT_NAME)));
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE, 0);
    }

    function test_commitResource() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitBatch() public addGameElement {
        uint256 nonce = 0;
        bytes[] memory batch = new bytes[](2);
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

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
    function test_grantRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE, gameManager);
        assertTrue(
            gameRegestry.hasRole(GAME_SIGNER_ROLE, gameManager), "The gameManager now should have GAME_SIGNER_ROLE"
        );
    }

    function test_grantRoleNotAdmin() public {
        address gameManager = makeAddr("gameManager");
        vm.expectRevert(
            abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", address(this), bytes32(0))
        );
        gameRegestry.grantRole(GAME_SIGNER_ROLE, gameManager);
    }

    function test_revokeRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        gameRegestry.revokeRole(GAME_SIGNER_ROLE, gameManager);
        assertTrue(
            !gameRegestry.hasRole(GAME_SIGNER_ROLE, gameManager), "The gameManager now should have GAME_SIGNER_ROLE"
        );
    }

    function test_revokeRoleNotAdmin() public {
        address gameManager = makeAddr("gameManager");
        vm.expectRevert(
            abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", address(this), bytes32(0))
        );
        gameRegestry.revokeRole(GAME_SIGNER_ROLE, gameManager);
    }

    function test_revokeAdminRole() public {
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminRules()"));
        gameRegestry.revokeRole(DEFAULT_ADMIN_ROLE, ADMIN);
        assertTrue(gameRegestry.hasRole(DEFAULT_ADMIN_ROLE, ADMIN), "The ADMIN should have DEFAULT_ADMIN_ROLE");
    }

    function test_grantAdminRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminRules()"));
        gameRegestry.grantRole(DEFAULT_ADMIN_ROLE, gameManager);
    }

    function test_renounceAdminRole() public {
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminDelay(uint48)", 0));
        gameRegestry.renounceRole(DEFAULT_ADMIN_ROLE, ADMIN);
    }

    function test_renounce() public {
        vm.prank(GAME_SIGNER);
        gameRegestry.renounceRole(GAME_SIGNER_ROLE, GAME_SIGNER);
        assertTrue(
            !gameRegestry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "The GAME_SIGNER should  not have GAME_SIGNER_ROLE"
        );
    }

    /*//////////////////////////////////////////////////////////////
                             GET FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function test_getGameElement() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        GameRegestry.GameElementStruct memory gameElemetStruct = gameRegestry.getGameElement(resourceHash);
        assertEq(
            address(gameRegestry),
            gameElemetStruct.tokenAddress,
            "Element tokenAddress should match the tokenAddress from modifier"
        );
    }

    function test_getGameCoinsList() public addGameCoin {
        string[] memory coinsNames = gameRegestry.getGameCoinsList();
        assertTrue(coinsNames.length > 0, "Coins list should not be empty");
    }

    function test_getResourcesList() public addGameElement {
        string[] memory resourceNames = gameRegestry.getResourcesList();
        assertTrue(resourceNames.length > 0, "Resources list should not be empty");
    }

    function test_getCharactersList() public addGameCharacter {
        string[] memory characters = gameRegestry.getCharactersList();
        assertTrue(characters.length > 0, "Characters list should not be empty");
    }

    function test_getUniqueItemsList() public addGameUniqueItem {
        string[] memory uniqueItems = gameRegestry.getUniqueItemsList();
        assertTrue(uniqueItems.length > 0, "Unique items list should not be empty");
    }

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

        bytes32 TYPE_HASH =
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

        bytes32 _hashedName = keccak256(bytes("GameRegestry"));
        bytes32 _hashedVersion = keccak256(bytes("1"));

        bytes32 hashStruct = keccak256(
            abi.encode(
                MESSAGE_TYPEHASH,
                GameRegestry.CommitStruct({
                    target: target, account: account, signer: signer, nonce: nonce, callData: callData
                })
            )
        );

        bytes32 domainSeparatorV4 =
            keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(gameRegestry)));
        return MessageHashUtils.toTypedDataHash(domainSeparatorV4, hashStruct);
    }

    function getSignedMessage(uint256 nonce, bytes memory callData)
        public
        returns (bytes32, bytes memory, bytes memory)
    {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        //bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)",1);

        address target = address(gameRegestry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        return (resourceHash, commit, signature);
    }
}

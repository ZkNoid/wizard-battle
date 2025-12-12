// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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
                           INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_setUp() public view {
        assertTrue(gameRegestry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "Game Signer should have a GAME_SIGNER_ROLE");
    }

    function test_initializeWithZeroAddressGameSigner() public {
        // Deploy a new proxy without initialization
        GameRegestry implementation = new GameRegestry();

        string[] memory coins = new string[](1);
        coins[0] = "gold";

        vm.expectRevert(GameRegestry.GameRegestry__InvalidGameSigner.selector);

        bytes memory initData = abi.encodeCall(GameRegestry.initialize, (coins, coins, coins, coins, address(0)));

        new ERC1967Proxy(address(implementation), initData);
    }

    /*//////////////////////////////////////////////////////////////
                             ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    function test_userHasGameSignerRole() public view {
        assertTrue(gameRegestry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "Game Signer should have a GAME_SIGNER_ROLE");
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

    function test_getIsNonceUsed() public addGameElement {
        // Test unused nonce
        assertFalse(gameRegestry.getIsNonceUsed(999), "Nonce 999 should not be used");

        // Use a nonce
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        // Test used nonce
        assertTrue(gameRegestry.getIsNonceUsed(0), "Nonce 0 should be used");
    }

    function test_getBatchMaxLength() public view {
        uint256 maxLength = gameRegestry.getBatchMaxLength();
        assertEq(maxLength, 100, "Batch max length should be 100");
    }

    /*//////////////////////////////////////////////////////////////
                       ADD GAME ELEMENT - SUCCESS
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

    /*//////////////////////////////////////////////////////////////
                       ADD GAME ELEMENT - REVERTS
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

    function test_addGameElementWithZeroAddress() public {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegestry.GameRegestry__AddressZero.selector);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: "iron",
            elementTokenAddress: address(0),
            elementTokenId: 0,
            elementHasTokenId: false
        });
    }

    function test_addGameElementWithEmptyName() public {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegestry.GameRegestry__GameElementNameIsEmpty.selector);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: "",
            elementTokenAddress: address(gameRegestry),
            elementTokenId: 0,
            elementHasTokenId: false
        });
    }

    function test_addGameElementThatAlreadyExists() public addGameElement {
        address tokenAddress = address(gameRegestry);

        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegestry.GameRegestry__GameElementExists.selector);
        gameRegestry.addGameElement({
            elementType: GameRegestry.GameElementType.RESOURCE,
            name: ELEMENT_NAME, // Same name as in modifier
            elementTokenAddress: tokenAddress,
            elementTokenId: 0,
            elementHasTokenId: false
        });
    }

    /*//////////////////////////////////////////////////////////////
                      REMOVE GAME ELEMENT - SUCCESS
    //////////////////////////////////////////////////////////////*/

    function test_removeGameElementByGameSigner() public addGameElement {
        vm.prank(GAME_SIGNER);
        vm.expectEmit(true, true, false, false);
        emit RemoveGameElement(keccak256(bytes(ELEMENT_NAME)));
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE, 0);
    }

    /*//////////////////////////////////////////////////////////////
                      REMOVE GAME ELEMENT - REVERTS
    //////////////////////////////////////////////////////////////*/

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

    function test_removeGameElementIndexOutOfRange() public addGameElement {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegestry.GameRegestry__GameElementIndexOuntOfRange.selector);
        gameRegestry.removeGameElement(GameRegestry.GameElementType.RESOURCE, 999);
    }

    /*//////////////////////////////////////////////////////////////
                      COMMIT RESOURCE - SUCCESS
    //////////////////////////////////////////////////////////////*/

    function test_commitResource() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    /*//////////////////////////////////////////////////////////////
                      COMMIT RESOURCE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_commitResourceWithZeroResourceHash() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);

        vm.expectRevert(GameRegestry.GameRegestry__InvalidCommitData.selector);
        gameRegestry.commitResource({resourceHash: bytes32(0), commit: commit, signature: signature});
    }

    function test_commitResourceWithEmptyCommit() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory emptyCommit = "";
        bytes memory signature = "0x123456";

        vm.expectRevert(GameRegestry.GameRegestry__InvalidCommitData.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: emptyCommit, signature: signature});
    }

    function test_commitResourceWithEmptySignature() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit,) = getSignedMessage(0, callData);
        bytes memory emptySignature = "";

        vm.expectRevert(GameRegestry.GameRegestry__InvalidCommitData.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: emptySignature});
    }

    function test_commitResourceWithInvalidTarget() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(0); // Invalid target
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__InvalidTarget.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWhenCallFails() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));

        // Create callData that will fail (invalid function signature)
        bytes memory callData = abi.encodeWithSignature("nonExistentFunction()");

        address target = address(gameRegestry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__CommitFailed.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithUsedNonce() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(5, callData);

        // First commit - should succeed
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        // Second commit with same nonce - should fail
        vm.expectRevert(GameRegestry.GameRegestry__NonceAlreadyUsed.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithNonExistentResource() public {
        bytes32 nonExistentResourceHash = keccak256(bytes("nonexistent"));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegestry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__InvalidResource.selector);
        gameRegestry.commitResource({resourceHash: nonExistentResourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithMismatchedTarget() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = makeAddr("wrongTarget"); // Different from gameElement.tokenAddress
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__UnknownTargetAddress.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithZeroAccount() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegestry);
        address account = address(0); // Invalid account
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__InvalidPlayer.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithInvalidSigner() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegestry);
        address account = makeAddr("player");
        address invalidSigner = makeAddr("invalidSigner"); // Not GAME_SIGNER_ROLE
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, invalidSigner, nonce, callData);

        // Sign with different key
        (address randomSigner, uint256 randomKey) = makeAddrAndKey("random");
        bytes32 digest = getMessageHash(target, account, randomSigner, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(randomKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__InvalidSigner.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithInvalidSignature() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit,) = getSignedMessage(0, callData);

        // Create a fake/invalid signature
        bytes memory invalidSignature = abi.encodePacked(bytes32(uint256(1)), bytes32(uint256(2)), bytes1(uint8(27)));

        vm.expectRevert(GameRegestry.GameRegestry__NotSigner.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: invalidSignature});
    }

    function test_commitResourceSignerMismatch() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegestry);
        address account = GAME_SIGNER; // Account has role
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        // Sign with different private key
        (, uint256 wrongKey) = makeAddrAndKey("wrong");
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegestry.GameRegestry__NotAllowedToCommit.selector);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    /*//////////////////////////////////////////////////////////////
                       COMMIT BATCH - SUCCESS
    //////////////////////////////////////////////////////////////*/

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
                        COMMIT BATCH - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_commitBatchZeroNonce() public {
        bytes[] memory batch = new bytes[](0);
        vm.expectRevert(GameRegestry.GameRegestry__InvalidNonce.selector);
        gameRegestry.commitBatch(0, batch);
    }

    function test_commitBatchZeroLength() public {
        bytes[] memory batch = new bytes[](0);
        vm.expectRevert(GameRegestry.GameRegestry__BatchLengthZero.selector);
        gameRegestry.commitBatch(1, batch);
    }

    function test_commitBatchLengthExcidesMaxLength() public {
        uint256 batchLengthMax = gameRegestry.getBatchMaxLength();
        bytes[] memory batch = new bytes[](batchLengthMax + 1);
        vm.expectRevert(GameRegestry.GameRegestry__BatchLengthTooLong.selector);
        gameRegestry.commitBatch(1, batch);
    }

    /*//////////////////////////////////////////////////////////////
                             UPGRADES
    //////////////////////////////////////////////////////////////*/

    function test_authorizeUpgrade() public {
        address newImplementation = address(new GameRegestry());

        // Should fail for non-admin
        vm.expectRevert();
        gameRegestry.upgradeToAndCall(newImplementation, "");

        // Should succeed for admin
        vm.prank(ADMIN);
        gameRegestry.upgradeToAndCall(newImplementation, "");
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMessageHash(
        address target,
        address account,
        address signer,
        uint256 nonce,
        bytes memory callData
    )
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

    function getSignedMessage(
        uint256 nonce,
        bytes memory callData
    )
        public
        returns (bytes32, bytes memory, bytes memory)
    {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));

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

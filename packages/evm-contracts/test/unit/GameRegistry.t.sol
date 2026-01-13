// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameRegistry} from "src/GameRegistry.sol";
import {DeployGameRegistry} from "script/DeployGameRegistry.s.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract GameRegistryTest is Test {
    event CommitResources(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);
    event RemoveGameElement(bytes32 indexed nameHash);

    GameRegistry public gameRegistry;

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
        address gameRegistryAddress = new DeployGameRegistry().deploy();
        gameRegistry = GameRegistry(gameRegistryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegistry.renounceRole(GAME_SIGNER_ROLE, address(this));

        ADMIN = msg.sender;
        (GAME_SIGNER, GAME_SIGNER_PRIV_KEY) = makeAddrAndKey("GAME_SIGNER");

        vm.prank(ADMIN);
        gameRegistry.grantRole(GAME_SIGNER_ROLE, GAME_SIGNER);
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier addGameElement() {
        address tokenAddress = address(gameRegistry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE,
            name: ELEMENT_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameCoin() {
        address tokenAddress = address(gameRegistry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.COIN,
            name: COIN_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameCharacter() {
        address tokenAddress = address(gameRegistry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.CHARACTER,
            name: CHARCTER,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });

        _;
    }

    modifier addGameUniqueItem() {
        address tokenAddress = address(gameRegistry);
        uint256 elementTokenId = 0;
        bool elementHasTokenId = false;

        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.UNIQUE_ITEM,
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
        assertTrue(gameRegistry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "Game Signer should have a GAME_SIGNER_ROLE");
    }

    function test_initializeWithZeroAddressGameSigner() public {
        // Deploy a new proxy without initialization
        GameRegistry implementation = new GameRegistry();

        string[] memory coins = new string[](1);
        coins[0] = "gold";

        vm.expectRevert(GameRegistry.GameRegistry__InvalidGameSigner.selector);

        bytes memory initData = abi.encodeCall(GameRegistry.initialize, (coins, coins, coins, coins, address(0)));

        new ERC1967Proxy(address(implementation), initData);
    }

    /*//////////////////////////////////////////////////////////////
                             ACCESS CONTROL
    //////////////////////////////////////////////////////////////*/

    function test_userHasGameSignerRole() public view {
        assertTrue(gameRegistry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "Game Signer should have a GAME_SIGNER_ROLE");
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_grantRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        gameRegistry.grantRole(GAME_SIGNER_ROLE, gameManager);
        assertTrue(gameRegistry.hasRole(GAME_SIGNER_ROLE, gameManager), "The gameManager now should have GAME_SIGNER_ROLE");
    }

    function test_grantRoleNotAdmin() public {
        address gameManager = makeAddr("gameManager");
        vm.expectRevert(abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", address(this), bytes32(0)));
        gameRegistry.grantRole(GAME_SIGNER_ROLE, gameManager);
    }

    function test_revokeRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        gameRegistry.revokeRole(GAME_SIGNER_ROLE, gameManager);
        assertTrue(!gameRegistry.hasRole(GAME_SIGNER_ROLE, gameManager), "The gameManager now should have GAME_SIGNER_ROLE");
    }

    function test_revokeRoleNotAdmin() public {
        address gameManager = makeAddr("gameManager");
        vm.expectRevert(abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", address(this), bytes32(0)));
        gameRegistry.revokeRole(GAME_SIGNER_ROLE, gameManager);
    }

    function test_revokeAdminRole() public {
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminRules()"));
        gameRegistry.revokeRole(DEFAULT_ADMIN_ROLE, ADMIN);
        assertTrue(gameRegistry.hasRole(DEFAULT_ADMIN_ROLE, ADMIN), "The ADMIN should have DEFAULT_ADMIN_ROLE");
    }

    function test_grantAdminRole() public {
        address gameManager = makeAddr("gameManager");
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminRules()"));
        gameRegistry.grantRole(DEFAULT_ADMIN_ROLE, gameManager);
    }

    function test_renounceAdminRole() public {
        vm.prank(ADMIN);
        vm.expectRevert(abi.encodeWithSignature("AccessControlEnforcedDefaultAdminDelay(uint48)", 0));
        gameRegistry.renounceRole(DEFAULT_ADMIN_ROLE, ADMIN);
    }

    function test_renounce() public {
        vm.prank(GAME_SIGNER);
        gameRegistry.renounceRole(GAME_SIGNER_ROLE, GAME_SIGNER);
        assertTrue(!gameRegistry.hasRole(GAME_SIGNER_ROLE, GAME_SIGNER), "The GAME_SIGNER should  not have GAME_SIGNER_ROLE");
    }

    /*//////////////////////////////////////////////////////////////
                             GET FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_getGameElement() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        GameRegistry.GameElementStruct memory gameElemetStruct = gameRegistry.getGameElement(resourceHash);
        assertEq(address(gameRegistry), gameElemetStruct.tokenAddress, "Element tokenAddress should match the tokenAddress from modifier");
    }

    function test_getGameCoinsList() public addGameCoin {
        string[] memory coinsNames = gameRegistry.getGameCoinsList();
        assertTrue(coinsNames.length > 0, "Coins list should not be empty");
    }

    function test_getResourcesList() public addGameElement {
        string[] memory resourceNames = gameRegistry.getResourcesList();
        assertTrue(resourceNames.length > 0, "Resources list should not be empty");
    }

    function test_getCharactersList() public addGameCharacter {
        string[] memory characters = gameRegistry.getCharactersList();
        assertTrue(characters.length > 0, "Characters list should not be empty");
    }

    function test_getUniqueItemsList() public addGameUniqueItem {
        string[] memory uniqueItems = gameRegistry.getUniqueItemsList();
        assertTrue(uniqueItems.length > 0, "Unique items list should not be empty");
    }

    function test_getIsNonceUsed() public addGameElement {
        // Test unused nonce
        assertFalse(gameRegistry.getIsNonceUsed(999), "Nonce 999 should not be used");

        // Use a nonce
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        // Test used nonce
        assertTrue(gameRegistry.getIsNonceUsed(0), "Nonce 0 should be used");
    }

    function test_getBatchMaxLength() public view {
        uint256 maxLength = gameRegistry.getBatchMaxLength();
        assertEq(maxLength, 100, "Batch max length should be 100");
    }

    function test_getMessageHashDirectCall() public {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        bytes32 hash = getMessageHash(address(gameRegistry), makeAddr("player"), GAME_SIGNER, 1, callData);
        assertTrue(hash != bytes32(0), "Hash should not be zero");
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

        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE,
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

        vm.expectRevert(GameRegistry.GameRegistry__OnlyGameSignerRole.selector);

        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE,
            name: ELEMENT_NAME,
            elementTokenAddress: tokenAddress,
            elementTokenId: elementTokenId,
            elementHasTokenId: elementHasTokenId
        });
    }

    function test_addGameElementWithZeroAddress() public {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegistry.GameRegistry__AddressZero.selector);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE, name: "iron", elementTokenAddress: address(0), elementTokenId: 0, elementHasTokenId: false
        });
    }

    function test_addGameElementWithEmptyName() public {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegistry.GameRegistry__GameElementNameIsEmpty.selector);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE,
            name: "",
            elementTokenAddress: address(gameRegistry),
            elementTokenId: 0,
            elementHasTokenId: false
        });
    }

    function test_addGameElementThatAlreadyExists() public addGameElement {
        address tokenAddress = address(gameRegistry);

        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegistry.GameRegistry__GameElementExists.selector);
        gameRegistry.addGameElement({
            elementType: GameRegistry.GameElementType.RESOURCE,
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
        gameRegistry.removeGameElement(GameRegistry.GameElementType.RESOURCE, 0);
    }

    /*//////////////////////////////////////////////////////////////
                      REMOVE GAME ELEMENT - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_removeGameElementByNonGameSigner() public addGameElement {
        // prank Game Signer and resource
        string[] memory ALL_ELEMENTS = gameRegistry.getResourcesList();
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
        vm.expectRevert(GameRegistry.GameRegistry__OnlyGameSignerRole.selector);
        gameRegistry.removeGameElement(GameRegistry.GameElementType.RESOURCE, ELEMENT_NAME_INDEX);
    }

    function test_removeGameElementIndexOutOfRange() public addGameElement {
        vm.prank(GAME_SIGNER);
        vm.expectRevert(GameRegistry.GameRegistry__GameElementIndexOuntOfRange.selector);
        gameRegistry.removeGameElement(GameRegistry.GameElementType.RESOURCE, 999);
    }

    /*//////////////////////////////////////////////////////////////
                      COMMIT RESOURCE - SUCCESS
    //////////////////////////////////////////////////////////////*/

    function test_commitResource() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    /*//////////////////////////////////////////////////////////////
                      COMMIT RESOURCE - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_commitResourceWithZeroResourceHash() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (, bytes memory commit, bytes memory signature) = getSignedMessage(0, callData);

        vm.expectRevert(GameRegistry.GameRegistry__InvalidCommitData.selector);
        gameRegistry.commitResource({resourceHash: bytes32(0), commit: commit, signature: signature});
    }

    function test_commitResourceWithEmptyCommit() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory emptyCommit = "";
        bytes memory signature = "0x123456";

        vm.expectRevert(GameRegistry.GameRegistry__InvalidCommitData.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: emptyCommit, signature: signature});
    }

    function test_commitResourceWithEmptySignature() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit,) = getSignedMessage(0, callData);
        bytes memory emptySignature = "";

        vm.expectRevert(GameRegistry.GameRegistry__InvalidCommitData.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: emptySignature});
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

        vm.expectRevert(GameRegistry.GameRegistry__InvalidTarget.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWhenCallFails() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));

        // Create callData that will fail (invalid function signature)
        bytes memory callData = abi.encodeWithSignature("nonExistentFunction()");

        address target = address(gameRegistry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegistry.GameRegistry__CommitFailed.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithUsedNonce() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage(5, callData);

        // First commit - should succeed
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        // Second commit with same nonce - should fail
        vm.expectRevert(GameRegistry.GameRegistry__NonceAlreadyUsed.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithNonExistentResource() public {
        bytes32 nonExistentResourceHash = keccak256(bytes("nonexistent"));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegistry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegistry.GameRegistry__InvalidResource.selector);
        gameRegistry.commitResource({resourceHash: nonExistentResourceHash, commit: commit, signature: signature});
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

        vm.expectRevert(GameRegistry.GameRegistry__UnknownTargetAddress.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithZeroAccount() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegistry);
        address account = address(0); // Invalid account
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegistry.GameRegistry__InvalidPlayer.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithInvalidSigner() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegistry);
        address account = makeAddr("player");
        address invalidSigner = makeAddr("invalidSigner"); // Not GAME_SIGNER_ROLE
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, invalidSigner, nonce, callData);

        // Sign with different key
        (address randomSigner, uint256 randomKey) = makeAddrAndKey("random");
        bytes32 digest = getMessageHash(target, account, randomSigner, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(randomKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegistry.GameRegistry__InvalidSigner.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
    }

    function test_commitResourceWithInvalidSignature() public addGameElement {
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);
        (bytes32 resourceHash, bytes memory commit,) = getSignedMessage(0, callData);

        // Create a fake/invalid signature
        bytes memory invalidSignature = abi.encodePacked(bytes32(uint256(1)), bytes32(uint256(2)), bytes1(uint8(27)));

        vm.expectRevert(GameRegistry.GameRegistry__NotSigner.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: invalidSignature});
    }

    function test_commitResourceSignerMismatch() public addGameElement {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));
        bytes memory callData = abi.encodeWithSignature("getIsNonceUsed(uint256)", 1);

        address target = address(gameRegistry);
        address account = GAME_SIGNER; // Account has role
        address signer = GAME_SIGNER;
        uint256 nonce = 1;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        // Sign with different private key
        (, uint256 wrongKey) = makeAddrAndKey("wrong");
        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert(GameRegistry.GameRegistry__NotAllowedToCommit.selector);
        gameRegistry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});
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
        gameRegistry.commitBatch(nonce, batch);
    }

    /*//////////////////////////////////////////////////////////////
                        COMMIT BATCH - REVERTS
    //////////////////////////////////////////////////////////////*/

    function test_commitBatchZeroNonce() public {
        bytes[] memory batch = new bytes[](0);
        vm.expectRevert(GameRegistry.GameRegistry__InvalidNonce.selector);
        gameRegistry.commitBatch(0, batch);
    }

    function test_commitBatchZeroLength() public {
        bytes[] memory batch = new bytes[](0);
        vm.expectRevert(GameRegistry.GameRegistry__BatchLengthZero.selector);
        gameRegistry.commitBatch(1, batch);
    }

    function test_commitBatchLengthExcidesMaxLength() public {
        uint256 batchLengthMax = gameRegistry.getBatchMaxLength();
        bytes[] memory batch = new bytes[](batchLengthMax + 1);
        vm.expectRevert(GameRegistry.GameRegistry__BatchLengthTooLong.selector);
        gameRegistry.commitBatch(1, batch);
    }

    /*//////////////////////////////////////////////////////////////
                             UPGRADES
    //////////////////////////////////////////////////////////////*/

    function test_authorizeUpgrade() public {
        address newImplementation = address(new GameRegistry());

        // Should fail for non-admin
        vm.expectRevert();
        gameRegistry.upgradeToAndCall(newImplementation, "");

        // Should succeed for admin
        vm.prank(ADMIN);
        gameRegistry.upgradeToAndCall(newImplementation, "");
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData) public view returns (bytes32 digest) {
        bytes32 MESSAGE_TYPEHASH = keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");

        bytes32 TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

        bytes32 _hashedName = keccak256(bytes("GameRegistry"));
        bytes32 _hashedVersion = keccak256(bytes("1"));

        bytes32 hashStruct = keccak256(
            abi.encode(MESSAGE_TYPEHASH, GameRegistry.CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData}))
        );

        bytes32 domainSeparatorV4 = keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(gameRegistry)));
        return MessageHashUtils.toTypedDataHash(domainSeparatorV4, hashStruct);
    }

    function getSignedMessage(uint256 nonce, bytes memory callData) public returns (bytes32, bytes memory, bytes memory) {
        bytes32 resourceHash = keccak256(bytes(ELEMENT_NAME));

        address target = address(gameRegistry);
        address account = makeAddr("player");
        address signer = GAME_SIGNER;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        return (resourceHash, commit, signature);
    }
}

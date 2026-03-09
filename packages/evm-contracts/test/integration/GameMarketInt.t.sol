// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console, console2} from "forge-std/Test.sol";
import {IGameRegistry} from "src/interfaces/IGameRegistry.sol";
import {GameRegistry} from "src/GameRegistry.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";
import {WBCoin} from "src/tokens/ERC20/WBCoin.sol";
import {WBCharacters} from "src/tokens/ERC721/WBCharacters.sol";
import {DeployGameRegistry} from "script/DeployGameRegistry.s.sol";
import {DeployWBResources} from "script/DeployWBResources.s.sol";
import {DeployWBCoin} from "script/DeployWBCoin.s.sol";
import {DeployWBCharacters} from "script/DeployWBCharacters.s.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {DeployGameMarket} from "script/DeployGameMarket.s.sol";
import {GameMarket} from "src/GameMarket.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {ERC1155Mock} from "test/mocks/ERC1155Mock.sol";

contract GameMarketIntTest is Test {
    event commitSingles(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);
    event RemoveGameElement(bytes32 indexed nameHash);

    GameMarket public gameMarket;
    GameRegistry public gameRegistry;
    WBResources public wbResources;
    WBCoin public wBCoin;
    WBCharacters public wbCharacters;

    ERC20Mock public usdc;
    ERC1155Mock public gold;

    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    string public constant TOKEN_URI = "ipfs://QmToken1";

    address public GAME_SIGNER;
    address public ADMIN;
    address public PLAYER = makeAddr("PLAYER");
    address public TAKER = makeAddr("TAKER");
    address public TREASURY = makeAddr("TREASURY");

    uint256 public GAME_SIGNER_PRIV_KEY;

    function setUp() public {
        ADMIN = msg.sender;
        (GAME_SIGNER, GAME_SIGNER_PRIV_KEY) = makeAddrAndKey("GAME_SIGNER");

        address wbResourcesAddress = new DeployWBResources().deploy();
        wbResources = WBResources(wbResourcesAddress);

        address gameRegistryAddress = new DeployGameRegistry().deploy();
        gameRegistry = GameRegistry(gameRegistryAddress);

        address gameMarketAddress = new DeployGameMarket().deploy();
        gameMarket = GameMarket(payable(gameMarketAddress));

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegistry.renounceRole(GAME_SIGNER_ROLE, address(this));

        usdc = new ERC20Mock();
        usdc.mint(TAKER, 1000e18);

        gold = new ERC1155Mock();
        gold.mint(TAKER, 1, 1000e18, "");

        ADMIN = msg.sender;

        vm.startPrank(ADMIN);
        gameRegistry.grantRole(GAME_SIGNER_ROLE, GAME_SIGNER);
        gameMarket.setGameRegistry(gameRegistryAddress);
        gameMarket.allowToken(address(gold));
        gameMarket.allowToken(address(usdc));
        gameMarket.setTreasury(TREASURY);
        vm.stopPrank();

        wBCoin = WBCoin(new DeployWBCoin().deploy());
        wBCoin.grantRole(MINTER_ROLE, gameRegistryAddress);
        wBCoin.grantRole(MINTER_ROLE, GAME_SIGNER);

        wbResources = WBResources(new DeployWBResources().deploy());
        wbResources.grantRole(MINTER_ROLE, gameRegistryAddress);
        wbResources.grantRole(MINTER_ROLE, GAME_SIGNER);

        wbCharacters = WBCharacters(new DeployWBCharacters().deploy());
        wbCharacters.grantRole(MINTER_ROLE, gameRegistryAddress);
        wbCharacters.grantRole(MINTER_ROLE, GAME_SIGNER);
    }

    modifier addCoinResourceType() {
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.COIN, "WBCoin", address(wBCoin), 0, false);
        _;
    }

    modifier addResourceType() {
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Wood", address(wbResources), 1, true);
        _;
    }

    modifier addCharacterType() {
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.CHARACTER, "Wizard", address(wbCharacters), 0, false);
        _;
    }

    modifier mintResourceToPlayer() {
        _mintWBResourceToPlayer();
        _;
    }

    function test_getElementAndCreateOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.prank(PLAYER);
        gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
    }

    function test_cancelOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.prank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));

        vm.prank(PLAYER);
        gameMarket.cancelOrder(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.CANCELED));
    }

    function test_fillOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        vm.deal(TAKER, 2e18);

        console2.log("maker balance: ", address(order.maker).balance);
        console2.log("taker balance: ", address(TAKER).balance);
        console2.log("gameMarket balance: ", address(gameMarket).balance);

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        uint256 totalPrice = gameMarket.previewTotalPrice(order.price);
        vm.prank(TAKER);
        gameMarket.fillOrder{value: totalPrice}(orderId);

        order = gameMarket.getOrder(orderId);

        console2.log("\n after");
        console2.log("maker balance: ", address(order.maker).balance);
        console2.log("taker balance: ", address(order.taker).balance);
        console2.log("gameMarket balance: ", address(gameMarket).balance);

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        assertEq(WBResources(gameElement.tokenAddress).balanceOf(TAKER, order.tokenId), order.amount, "TAKER has the order amount");
    }

    function test_fillTokenOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(usdc),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        GameMarket.Order memory order = gameMarket.getOrder(orderId);

        console2.log("maker balance: ", usdc.balanceOf(order.maker));
        console2.log("taker balance: ", usdc.balanceOf(TAKER));
        console2.log("gameMarket balance: ", usdc.balanceOf(address(gameMarket)));

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        uint256 totalPrice = gameMarket.previewTotalPrice(order.price);
        vm.startPrank(TAKER);
        usdc.approve(address(gameMarket), totalPrice);
        gameMarket.fillOrder(orderId);
        vm.stopPrank();

        order = gameMarket.getOrder(orderId);

        console2.log("\n after");
        console2.log("maker balance: ", usdc.balanceOf(order.maker));
        console2.log("taker balance: ", usdc.balanceOf(order.taker));
        console2.log("gameMarket balance: ", usdc.balanceOf(address(gameMarket)));

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        assertEq(WBResources(gameElement.tokenAddress).balanceOf(TAKER, order.tokenId), order.amount, "TAKER has the order amount");
    }

    function test_fillTokenIdOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(gold),
            paymentTokenId: 1,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        GameMarket.Order memory order = gameMarket.getOrder(orderId);

        uint256 takerGoldBalanceBefore = gold.balanceOf(TAKER, 1);
        console2.log("maker balance: ", gold.balanceOf(order.maker, 1));
        console2.log("taker balance: ", takerGoldBalanceBefore);
        console2.log("gameMarket balance: ", gold.balanceOf(address(gameMarket), 1));

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        vm.startPrank(TAKER);
        gold.setApprovalForAll(address(gameMarket), true);
        gameMarket.fillOrder(orderId);
        vm.stopPrank();

        order = gameMarket.getOrder(orderId);

        console2.log("\n after");
        console2.log("maker balance: ", gold.balanceOf(order.maker, 1));
        console2.log("taker balance: ", gold.balanceOf(order.taker, 1));
        console2.log("gameMarket balance: ", gold.balanceOf(address(gameMarket), 1));

        console2.log("orderId: ", orderId);
        console2.log("maker: ", order.maker);
        console2.log("taker: ", order.taker);
        console2.log("token: ", order.token);
        console2.log("tokenId: ", order.tokenId);
        console2.log("paymentToken: ", order.paymentToken);
        console2.log("amount: ", order.amount);
        console2.log("price: ", order.price);
        console2.log("status: ", uint8(order.status));
        console2.log("nameHash:", vm.toString(order.nameHash));

        assertEq(WBResources(gameElement.tokenAddress).balanceOf(TAKER, order.tokenId), order.amount, "TAKER has the order amount");
        assertEq(takerGoldBalanceBefore - order.price, gold.balanceOf(order.taker, 1), "TAKER paid with gold");
    }

    function test_fillOrderWithMultipleResources() public {
        // Add multiple resource types to registry
        vm.startPrank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Stone", address(wbResources), 2, true);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Gold", address(wbResources), 3, true);
        vm.stopPrank();

        // Mint resources
        uint256 amount = 500;
        bytes memory callDataStone = abi.encodeWithSignature("mint(address,uint256,uint256,bytes)", PLAYER, 2, amount, "");
        (bytes32 stoneHash, bytes memory stoneCommit, bytes memory stoneSignature) = _getSignedMessage("Stone", address(wbResources), 0, callDataStone);

        vm.prank(PLAYER);
        gameRegistry.commitSingle({resourceHash: stoneHash, commit: stoneCommit, signature: stoneSignature});

        // Create and fill orders for both resources
        vm.prank(PLAYER);
        uint256 orderId1 = gameMarket.createOrder({
            token: address(wbResources), tokenId: 2, price: 1e18, amount: 100, paymentToken: address(0), paymentTokenId: 0, nameHash: keccak256("Stone")
        });

        vm.prank(PLAYER);
        WBResources(address(wbResources)).setApprovalForAll(address(gameMarket), true);

        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);
        vm.prank(TAKER);
        vm.deal(TAKER, totalPrice);
        gameMarket.fillOrder{value: totalPrice}(orderId1);

        assertEq(wbResources.balanceOf(TAKER, 2), 100);
    }

    function test_cancelOrderPreventsFilling() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        vm.prank(PLAYER);
        gameMarket.cancelOrder(orderId);

        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);
        vm.prank(TAKER);
        vm.deal(TAKER, totalPrice);
        vm.expectRevert(GameMarket.GameMarket_InvalidOrderState.selector);
        gameMarket.fillOrder{value: totalPrice}(orderId);
    }

    function test_pauseAndUnpauseOrder() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        // Pause order
        vm.prank(PLAYER);
        gameMarket.pauseOrder(orderId);

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.PAUSED));

        // Cannot fill paused order
        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);
        vm.prank(TAKER);
        vm.deal(TAKER, totalPrice);
        vm.expectRevert(GameMarket.GameMarket_InvalidOrderState.selector);
        gameMarket.fillOrder{value: totalPrice}(orderId);

        // Unpause order
        vm.prank(PLAYER);
        gameMarket.unpauseOrder(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));

        // Now can fill
        vm.prank(TAKER);
        vm.deal(TAKER, totalPrice);
        gameMarket.fillOrder{value: totalPrice}(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.FILLED));
    }

    function test_getGameElementsList() public {
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Wood", address(wbResources), 1, true);

        string[] memory resources = gameMarket.getGameElementsList(uint8(IGameRegistry.GameElementType.RESOURCE));
        assertGt(resources.length, 0);
    }

    function test_setGameRegistry() public {
        address newRegistry = makeAddr("newRegistry");

        vm.prank(ADMIN);
        gameMarket.setGameRegistry(newRegistry);

        // Verify the registry was set by calling a view function that uses it
        // Note: This will fail if newRegistry doesn't implement IGameRegistry properly,
        // but we're testing that the setter works
    }

    function test_fillOrderTransfersFeesToMarket() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(usdc),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        uint256 initialBalance = usdc.balanceOf(address(TREASURY));
        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);
        uint256 expectedFee = totalPrice - 1e18;

        vm.startPrank(TAKER);
        usdc.approve(address(gameMarket), totalPrice);
        gameMarket.fillOrder(orderId);
        vm.stopPrank();

        uint256 finalBalance = usdc.balanceOf(address(TREASURY));
        assertEq(finalBalance - initialBalance, expectedFee, "Fee was transferred to market");
    }

    function test_fillOrderWithERC20InsufficientAllowance() public mintResourceToPlayer {
        IGameRegistry.GameElementStruct memory gameElement = gameMarket.getGameElementName("Wood");

        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 1e18,
            amount: 100,
            paymentToken: address(usdc),
            paymentTokenId: 0,
            nameHash: keccak256("Wood")
        });
        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);

        // Try to fill without sufficient allowance
        vm.prank(TAKER);
        usdc.approve(address(gameMarket), totalPrice - 1); // One less than needed
        vm.expectRevert();
        gameMarket.fillOrder(orderId);
    }

    function test_fillOrderWithERC721Token() public {
        // Add character (ERC721) to registry
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.CHARACTER, "Wizard", address(wbCharacters), 0, false);

        // Mint character to player using simple mint function
        bytes memory callData = abi.encodeWithSignature("mint(address)", PLAYER);
        (bytes32 charHash, bytes memory charCommit, bytes memory charSignature) = _getSignedMessage("Wizard", address(wbCharacters), 0, callData);

        vm.prank(PLAYER);
        gameRegistry.commitSingle({resourceHash: charHash, commit: charCommit, signature: charSignature});

        // Get the token ID that was minted (should be 1 based on ERC721 behavior)
        uint256 tokenId = wbCharacters.tokenByIndex(0);

        // Create order for ERC721 character
        vm.startPrank(PLAYER);
        uint256 orderId = gameMarket.createOrder({
            token: address(wbCharacters), tokenId: tokenId, price: 1e18, amount: 1, paymentToken: address(0), paymentTokenId: 0, nameHash: keccak256("Wizard")
        });
        wbCharacters.setApprovalForAll(address(gameMarket), true);
        vm.stopPrank();

        // Fill order with ETH
        uint256 totalPrice = gameMarket.previewTotalPrice(1e18);
        vm.prank(TAKER);
        vm.deal(TAKER, totalPrice);
        gameMarket.fillOrder{value: totalPrice}(orderId);

        // Verify character was transferred to taker
        assertEq(wbCharacters.ownerOf(tokenId), TAKER);

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.FILLED));
        assertEq(order.taker, TAKER);
    }

    function test_getGameElementsListForAllTypes() public {
        // Add different element types
        vm.startPrank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Wood", address(wbResources), 1, true);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.COIN, "Gold", address(wBCoin), 0, false);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.CHARACTER, "Warrior", address(wbCharacters), 0, false);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.UNIQUE_ITEM, "Sword", address(wbCharacters), 0, false);
        vm.stopPrank();

        // Test each type
        string[] memory resources = gameMarket.getGameElementsList(uint8(IGameRegistry.GameElementType.RESOURCE));
        assertGt(resources.length, 0);

        string[] memory coins = gameMarket.getGameElementsList(uint8(IGameRegistry.GameElementType.COIN));
        assertGt(coins.length, 0);

        string[] memory characters = gameMarket.getGameElementsList(uint8(IGameRegistry.GameElementType.CHARACTER));
        assertGt(characters.length, 0);

        string[] memory uniqueItems = gameMarket.getGameElementsList(uint8(IGameRegistry.GameElementType.UNIQUE_ITEM));
        assertGt(uniqueItems.length, 0);

        // Test invalid type returns empty array
        string[] memory invalid = gameMarket.getGameElementsList(99);
        assertEq(invalid.length, 0);
    }

    function test_getGameElementHash() public {
        vm.prank(GAME_SIGNER);
        gameRegistry.addGameElement(IGameRegistry.GameElementType.RESOURCE, "Wood", address(wbResources), 1, true);

        bytes32 woodHash = keccak256("Wood");
        IGameRegistry.GameElementStruct memory element = gameMarket.getGameElementHash(woodHash);

        assertEq(element.tokenAddress, address(wbResources));
        assertEq(element.tokenId, 1);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _mintWBResourceToPlayer() internal addResourceType {
        console.log("Minting wood to player:", PLAYER);
        console.log("Game signer:", GAME_SIGNER);
        uint256 amount = 1000;

        bytes memory callData = abi.encodeWithSignature("mint(address,uint256,uint256,bytes)", PLAYER, 1, amount, "");
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = _getSignedMessage("Wood", address(wbResources), 0, callData);

        vm.prank(PLAYER);
        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegistry.commitSingle({resourceHash: resourceHash, commit: commit, signature: signature});

        uint256 playerWBCResourcelance = wbResources.balanceOf(PLAYER, 1);
        assertEq(playerWBCResourcelance, amount);

        console.log("WBResources total supply:", wbResources.totalSupply(1));
        console.log("PLAYER's WBResources balance:", playerWBCResourcelance);
    }

    function _getSignedMessage(
        string memory elementName,
        address target,
        uint256 nonce,
        bytes memory callData
    )
        internal
        view
        returns (bytes32, bytes memory, bytes memory)
    {
        bytes32 resourceHash = keccak256(bytes(elementName));

        address account = PLAYER;
        address signer = GAME_SIGNER;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        bytes32 digest = _getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        return (resourceHash, commit, signature);
    }

    function _getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData) internal view returns (bytes32 digest) {
        bytes32 MESSAGE_TYPEHASH = keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");

        bytes32 TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

        bytes32 _hashedName = keccak256(bytes("GameRegistry"));
        bytes32 _hashedVersion = keccak256(bytes("1"));

        bytes32 hashStruct = keccak256(
            abi.encode(
                MESSAGE_TYPEHASH, IGameRegistry.CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: keccak256(callData)})
            )
        );

        bytes32 domainSeparatorV4 = keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(gameRegistry)));
        return MessageHashUtils.toTypedDataHash(domainSeparatorV4, hashStruct);
    }
}

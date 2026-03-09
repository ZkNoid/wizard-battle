// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console2} from "forge-std/Test.sol";
import {GameMarket} from "src/GameMarket.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DeployGameMarket} from "script/DeployGameMarket.s.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";

contract GameMarketTest is Test {
    GameMarket public gameMarket;
    GameMarket public implementation;

    address public ADMIN;
    address public USER;

    function setUp() public {
        address gameMarketAddress = new DeployGameMarket().deploy();
        gameMarket = GameMarket(payable(gameMarketAddress));

        ADMIN = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                            INITIALIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_InitializeCannotBeCalledTwice() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        gameMarket.initialize(3000, address(0));
    }

    /*//////////////////////////////////////////////////////////////
                            UPGRADE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpgradeByAdmin() public {
        // Deploy new implementation
        GameMarket newImplementation = new GameMarket();

        // Upgrade to new implementation
        vm.prank(ADMIN);
        gameMarket.upgradeToAndCall(address(newImplementation), "");

        // Verify upgrade (still has admin role)
        assertTrue(gameMarket.hasRole(gameMarket.DEFAULT_ADMIN_ROLE(), ADMIN));
    }

    function test_UpgradeRevertsIfNotAdmin() public {
        // Deploy new implementation
        GameMarket newImplementation = new GameMarket();

        // Try to upgrade from non-admin account
        vm.prank(USER);
        vm.expectRevert();
        gameMarket.upgradeToAndCall(address(newImplementation), "");
    }

    /*//////////////////////////////////////////////////////////////
                            ACCESS CONTROL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AdminHasDefaultAdminRole() public view {
        assertTrue(gameMarket.hasRole(gameMarket.DEFAULT_ADMIN_ROLE(), ADMIN));
    }

    function test_GrantAndRevokeRole() public {
        bytes32 testRole = keccak256("TEST_ROLE");

        // Grant role
        vm.prank(ADMIN);
        gameMarket.grantRole(testRole, USER);
        vm.warp(block.timestamp + 1 days);
        assertTrue(gameMarket.hasRole(testRole, USER));

        // Revoke role
        vm.prank(ADMIN);
        gameMarket.revokeRole(testRole, USER);
        vm.warp(block.timestamp + 1 days);
        assertFalse(gameMarket.hasRole(testRole, USER));
    }

    function test_NonAdminCannotGrantRoles() public {
        bytes32 testRole = keccak256("TEST_ROLE");

        vm.prank(USER);
        vm.expectRevert();
        gameMarket.grantRole(testRole, USER);
    }

    /*//////////////////////////////////////////////////////////////
                              LOGIC TESTS
    //////////////////////////////////////////////////////////////*/
    function test_createOrder() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        address maker2 = makeAddr("maker2");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(order.maker, maker);
        assertEq(order.token, address(token));
        assertEq(order.tokenId, 1);
        assertEq(order.price, 1e18);
        assertEq(order.amount, 100);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));

        vm.prank(maker2);
        uint256 orderId2 =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        GameMarket.Order memory order2 = gameMarket.getOrder(orderId2);
        assertEq(order2.maker, maker2);
        assertEq(order2.token, address(token));
        assertEq(order2.tokenId, 1);
        assertEq(order2.price, 1e18);
        assertEq(order2.amount, 100);
        assertEq(uint8(order2.status), uint8(GameMarket.OrderStatus.OPEN));
    }

    /*//////////////////////////////////////////////////////////////
                        PROTOCOL FEE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_setProtocolFee() public {
        vm.prank(ADMIN);
        gameMarket.setProtocolFee(500); // 5%
        assertEq(gameMarket.getProtocolFee(), 500);
    }

    function test_setProtocolFeeRevertsIfNotAdmin() public {
        address nonAdmin = makeAddr("nonAdmin");
        vm.prank(nonAdmin);
        vm.expectRevert();
        gameMarket.setProtocolFee(500);
    }

    function test_setProtocolFeeUpdatesMultipleTimes() public {
        vm.startPrank(ADMIN);
        gameMarket.setProtocolFee(100);
        assertEq(gameMarket.getProtocolFee(), 100);

        gameMarket.setProtocolFee(250);
        assertEq(gameMarket.getProtocolFee(), 250);

        gameMarket.setProtocolFee(0);
        assertEq(gameMarket.getProtocolFee(), 0);
        vm.stopPrank();
    }

    function test_getProtocolFee() public view {
        uint256 fee = gameMarket.getProtocolFee();
        assertEq(fee, 3000); // From deployment script (30% = 3000 basis points)
    }

    /*//////////////////////////////////////////////////////////////
                    TOKEN WHITELIST TESTS
    //////////////////////////////////////////////////////////////*/

    function test_allowToken() public {
        address tokenToAllow = makeAddr("allowableToken");
        assertFalse(gameMarket.checkTokenIsAllowed(tokenToAllow));

        vm.prank(ADMIN);
        gameMarket.allowToken(tokenToAllow);

        assertTrue(gameMarket.checkTokenIsAllowed(tokenToAllow));
    }

    function test_allowTokenEmitsEvent() public {
        address tokenToAllow = makeAddr("allowableToken");

        vm.prank(ADMIN);
        vm.expectEmit(true, false, false, false);
        emit GameMarket.AllowToken(tokenToAllow);
        gameMarket.allowToken(tokenToAllow);
    }

    function test_allowTokenRevertsIfAlreadyAllowed() public {
        address tokenToAllow = makeAddr("allowableToken");

        vm.startPrank(ADMIN);
        gameMarket.allowToken(tokenToAllow);

        vm.expectRevert(GameMarket.GameMarket_TokenIsAllowed.selector);
        gameMarket.allowToken(tokenToAllow);
        vm.stopPrank();
    }

    function test_allowTokenRevertsIfNotAdmin() public {
        address nonAdmin = makeAddr("nonAdmin");
        vm.prank(nonAdmin);
        vm.expectRevert();
        gameMarket.allowToken(makeAddr("someToken"));
    }

    function test_disallowToken() public {
        address tokenToDisallow = makeAddr("disallowableToken");

        vm.startPrank(ADMIN);
        gameMarket.allowToken(tokenToDisallow);
        assertTrue(gameMarket.checkTokenIsAllowed(tokenToDisallow));

        gameMarket.disallowToken(tokenToDisallow);
        assertFalse(gameMarket.checkTokenIsAllowed(tokenToDisallow));
        vm.stopPrank();
    }

    function test_disallowTokenEmitsEvent() public {
        address tokenToDisallow = makeAddr("disallowableToken");

        vm.startPrank(ADMIN);
        gameMarket.allowToken(tokenToDisallow);

        vm.expectEmit(true, false, false, false);
        emit GameMarket.DisallowToken(tokenToDisallow);
        gameMarket.disallowToken(tokenToDisallow);
        vm.stopPrank();
    }

    function test_disallowTokenRevertsIfNotAllowed() public {
        address tokenNotAllowed = makeAddr("notAllowedToken");

        vm.prank(ADMIN);
        vm.expectRevert(GameMarket.GameMarket_TokenIsNotAllowed.selector);
        gameMarket.disallowToken(tokenNotAllowed);
    }

    function test_disallowTokenRevertsIfNotAdmin() public {
        address nonAdmin = makeAddr("nonAdmin");
        vm.prank(nonAdmin);
        vm.expectRevert();
        gameMarket.disallowToken(makeAddr("someToken"));
    }

    function test_checkTokenIsAllowed() public {
        address token = makeAddr("checkableToken");
        assertFalse(gameMarket.checkTokenIsAllowed(token));

        vm.prank(ADMIN);
        gameMarket.allowToken(token);

        assertTrue(gameMarket.checkTokenIsAllowed(token));
    }

    /*//////////////////////////////////////////////////////////////
                        ORDER MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_cancelOrder() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));

        vm.prank(maker);
        gameMarket.cancelOrder(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.CANCELED));
    }

    function test_cancelOrderEmitsEvent() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        vm.expectEmit(true, false, false, false);
        emit GameMarket.CancelOrder(orderId);
        gameMarket.cancelOrder(orderId);
    }

    function test_cancelOrderRevertsIfNotOwner() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        address nonOwner = makeAddr("nonOwner");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(nonOwner);
        vm.expectRevert(GameMarket.GameMarket_NotOwner.selector);
        gameMarket.cancelOrder(orderId);
    }

    function test_pauseOrder() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));

        vm.prank(maker);
        gameMarket.pauseOrder(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.PAUSED));
    }

    function test_pauseOrderEmitsEvent() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        vm.expectEmit(true, false, false, false);
        emit GameMarket.PauseOrder(orderId);
        gameMarket.pauseOrder(orderId);
    }

    function test_pauseOrderRevertsIfNotOwner() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        address nonOwner = makeAddr("nonOwner");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(nonOwner);
        vm.expectRevert(GameMarket.GameMarket_NotOwner.selector);
        gameMarket.pauseOrder(orderId);
    }

    function test_unpauseOrder() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        gameMarket.pauseOrder(orderId);

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.PAUSED));

        vm.prank(maker);
        gameMarket.unpauseOrder(orderId);

        order = gameMarket.getOrder(orderId);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));
    }

    function test_unpauseOrderEmitsEvent() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        gameMarket.pauseOrder(orderId);

        vm.prank(maker);
        vm.expectEmit(true, false, false, false);
        emit GameMarket.UnpauseOrder(orderId);
        gameMarket.unpauseOrder(orderId);
    }

    function test_unpauseOrderRevertsIfNotOwner() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        address nonOwner = makeAddr("nonOwner");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        gameMarket.pauseOrder(orderId);

        vm.prank(nonOwner);
        vm.expectRevert(GameMarket.GameMarket_NotOwner.selector);
        gameMarket.unpauseOrder(orderId);
    }

    function test_unpauseOrderRevertsIfNotPaused() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        vm.expectRevert(GameMarket.GameMarket_NotPausedOrder.selector);
        gameMarket.unpauseOrder(orderId);
    }

    /*//////////////////////////////////////////////////////////////
                    FILL ORDER ERROR CASES
    //////////////////////////////////////////////////////////////*/

    function test_fillOrderRevertsWithBadOrderId() public {
        vm.expectRevert(GameMarket.GameMarket_BadOrder.selector);
        gameMarket.fillOrder(0, address(0), 0);
    }

    function test_fillOrderRevertsWithInvalidOrderId() public {
        vm.expectRevert(GameMarket.GameMarket_BadOrder.selector);
        gameMarket.fillOrder(9999, address(0), 0);
    }

    function test_fillOrderRevertsWithInvalidPaymentMethod() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        address tokenPayment = makeAddr("paymentToken");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: tokenPayment, nameHash: keccak256("Wood")});

        address taker = makeAddr("taker");
        vm.prank(taker);
        vm.deal(taker, 2e18);
        vm.expectRevert(GameMarket.GameMarket_InvalidPaymentMethod.selector);
        gameMarket.fillOrder{value: 2e18}(orderId, tokenPayment, 0);
    }

    function test_fillOrderRevertsWithInsufficientAmount() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        // Price 1e18 + 30% fee (3000 bp) = 1.3e18, but only sending 1e18
        address taker = makeAddr("taker");
        vm.prank(taker);
        vm.deal(taker, 1e18);
        vm.expectRevert(GameMarket.GameMarket_InsufficientAmount.selector);
        gameMarket.fillOrder{value: 1e18}(orderId, address(0), 0);
    }

    function test_fillOrderRevertsWhenOrderNotOpen() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");

        vm.prank(maker);
        uint256 orderId =
            gameMarket.createOrder({token: address(token), tokenId: 1, price: 1e18, amount: 100, paymentToken: address(0), nameHash: keccak256("Wood")});

        vm.prank(maker);
        gameMarket.cancelOrder(orderId);

        address taker = makeAddr("taker");
        vm.prank(taker);
        vm.deal(taker, 2e18);
        vm.expectRevert(GameMarket.GameMarket_InvalidOrderState.selector);
        gameMarket.fillOrder{value: 2e18}(orderId, address(0), 0);
    }

    /*//////////////////////////////////////////////////////////////
                    VIEW FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_getOrder() public {
        WBResources token = new WBResources();
        address maker = makeAddr("maker");
        bytes32 nameHash = keccak256("Wood");

        vm.prank(maker);
        uint256 orderId = gameMarket.createOrder({token: address(token), tokenId: 5, price: 2e18, amount: 50, paymentToken: address(0), nameHash: nameHash});

        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        assertEq(order.maker, maker);
        assertEq(order.token, address(token));
        assertEq(order.tokenId, 5);
        assertEq(order.price, 2e18);
        assertEq(order.amount, 50);
        assertEq(uint8(order.status), uint8(GameMarket.OrderStatus.OPEN));
        assertEq(order.nameHash, nameHash);
    }

    function test_previewTotalPrice() public {
        vm.prank(ADMIN);
        gameMarket.setProtocolFee(1000); // 10% fee

        uint256 price = 100;
        uint256 totalPrice = gameMarket.previewTotalPrice(price);
        assertEq(totalPrice, 110); // 100 + 10
    }

    function test_previewTotalPriceWithZeroFee() public {
        vm.prank(ADMIN);
        gameMarket.setProtocolFee(0);

        uint256 price = 1e18;
        uint256 totalPrice = gameMarket.previewTotalPrice(price);
        assertEq(totalPrice, 1e18);
    }

    function test_previewTotalPriceWithHighFee() public {
        vm.prank(ADMIN);
        gameMarket.setProtocolFee(5000); // 50% fee

        uint256 price = 100;
        uint256 totalPrice = gameMarket.previewTotalPrice(price);
        assertEq(totalPrice, 150); // 100 + 50
    }
}

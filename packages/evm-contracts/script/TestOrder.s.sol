// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
// import {GameRegistry} from "src/GameRegistry.sol";
import {IGameRegistry} from "src/interfaces/IGameRegistry.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";
import {GameMarket} from "src/GameMarket.sol";

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

contract CreateOrder is Script {
    GameMarket gameMarket;
    IGameRegistry gameRegestry;
    WBResources wbResources;

    function run() public {
        gameMarket = GameMarket(payable(0x8865d8738E37671138D5270A7B4befeE83DeE904));
        gameRegestry = IGameRegistry(0x4e590B45fB999d93e981af65eB6A4eC06652A04D);
        // wbResources = WBResources(0xee52Ce7D2c46F8B728D74a030efCB78885F90E25);

        createOrder();
    }

    function createOrder() public {
        IGameRegistry.GameElementStruct memory gameElement = gameRegestry.getGameElementName("InfusedCrystal");
        uint256 balance = WBResources(gameElement.tokenAddress).balanceOf(msg.sender, 5);

        console2.log("account", msg.sender);
        console2.log("tokenAddress", gameElement.tokenAddress);
        console2.log("tokenId", gameElement.tokenId);
        console2.log("requiresTokenId", gameElement.requiresTokenId);
        console2.log("balance", balance);

        vm.startBroadcast();

        uint256 orderId = gameMarket.createOrder({
            token: gameElement.tokenAddress,
            tokenId: gameElement.tokenId,
            price: 0.02 ether,
            amount: 5,
            paymentToken: address(0),
            paymentTokenId: 0,
            nameHash: keccak256("InfusedCrystal")
        });

        WBResources(gameElement.tokenAddress).setApprovalForAll(address(gameMarket), true);

        vm.stopBroadcast();

        console2.log("orderId", orderId);
    }
}

contract FillOrder is Script {
    GameMarket gameMarket;
    IGameRegistry gameRegestry;
    WBResources wbResources;

    function run() public {
        gameMarket = GameMarket(payable(0x8865d8738E37671138D5270A7B4befeE83DeE904));
        gameRegestry = IGameRegistry(0x4e590B45fB999d93e981af65eB6A4eC06652A04D);

        fillOrder();
    }

    function fillOrder() public {
        IGameRegistry.GameElementStruct memory gameElement = gameRegestry.getGameElementName("InfusedCrystal");
        uint256 balance = WBResources(gameElement.tokenAddress).balanceOf(msg.sender, 5);

        vm.startBroadcast();

        console2.log("account", msg.sender);
        console2.log("balance", balance);
        console2.log("taker balance: ", address(msg.sender).balance);

        uint256 orderId = 1;
        GameMarket.Order memory order = gameMarket.getOrder(orderId);
        uint256 totalPrice = gameMarket.previewTotalPrice(order.price);
        gameMarket.fillOrder{value: totalPrice}(orderId);

        vm.stopBroadcast();

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

        balance = WBResources(gameElement.tokenAddress).balanceOf(msg.sender, 5);
        console2.log("\n balance", balance);
    }
}

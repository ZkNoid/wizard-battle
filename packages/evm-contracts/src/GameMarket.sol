// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {IGameRegistry} from "./interfaces/IGameRegistry.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GameMarket
 * @author Alexander Scherbatyuk (http://x.com/AlexScherbatyuk)
 * @notice Wizard Battle Game Market - An upgradeable marketplace contract for trading game assets
 * @dev This contract implements a marketplace with the following features:
 * - Upgradeable using UUPS proxy pattern
 * - Access control with default admin rules and time-delayed admin transfers
 * - Default admin role with 1-day delay for admin role transfers
 * - Upgrade capability restricted to DEFAULT_ADMIN_ROLE
 * @dev This is a foundational contract that can be extended with marketplace functionality
 */
contract GameMarket is Initializable, AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable, ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    error GameMarket_NotOwner();
    error GameMarket_BadOrder();
    error GameMarket_CanceledOrder();
    error GameMarket_NotPausedOrder();
    error GameMarket_InvalidPaymentMethod();
    error GameMarket_InvalidOrderState();
    error GameMarket_InsufficientAmount();
    error GameMarket_TransferFaild();
    error GameMarket_TokenIsAllowed();
    error GameMarket_TokenIsNotAllowed();
    error GameMarket_InsufficientAllowance();

    enum OrderStatus {
        NONE,
        OPEN,
        PAUSED,
        FILLED,
        CANCELED
    }

    struct Order {
        address maker;
        address taker;
        address token;
        uint256 tokenId;
        address paymentToken;
        uint256 amount;
        uint256 price;
        OrderStatus status;
        bytes32 nameHash;
    }
    uint256 private fee;
    uint256 private orderNextId;

    IGameRegistry private gameRegistry;

    mapping(uint256 => Order) private orders;
    mapping(address => bool) private whitelistedTokens;

    uint256 private constant BASIS_POINTS_SCALE = 10_000;

    event CreateOrder(uint256 indexed orderId, address indexed token, uint256 indexed tokenId, uint256 price, uint256 amount);
    event PauseOrder(uint256 indexed orderId);
    event UnpauseOrder(uint256 indexed orderId);
    event CancelOrder(uint256 indexed orderId);
    event AllowToken(address indexed token);
    event DisallowToken(address indexed token);
    event OrderFilled(uint256 indexed orderId, address indexed maker, address indexed taker, address token, uint256 tokenId, uint256 amount, bytes32 nameHash);

    modifier isOwner(uint256 orderId) {
        _isOrderOwner(orderId);
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    receive() external payable {}

    /**
     * @notice Initializes the GameMarket contract
     * @dev Sets up access control with a 1-day delay for admin role transfers.
     *      The deployer (msg.sender) becomes the default admin.
     *      This function can only be called once due to the initializer modifier.
     */
    function initialize(uint256 _fee, address _gameRegistry) external initializer {
        __AccessControlDefaultAdminRules_init(1 days, msg.sender);
        fee = _fee;
        gameRegistry = IGameRegistry(_gameRegistry);
        orderNextId = 1;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Sets the protocol fee for marketplace transactions
     * @param newFee The new fee amount in basis points (e.g., 100 = 1%)
     */
    function setProtocolFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        fee = newFee;
    }

    /**
     * @notice Whitelists a payment token for use in marketplace orders
     * @param token The token address to allow
     */
    function allowToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (whitelistedTokens[token]) {
            revert GameMarket_TokenIsAllowed();
        }
        whitelistedTokens[token] = true;
        emit AllowToken(token);
    }

    /**
     * @notice Removes a payment token from the marketplace whitelist
     * @param token The token address to disallow
     */
    function disallowToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!whitelistedTokens[token]) {
            revert GameMarket_TokenIsNotAllowed();
        }
        whitelistedTokens[token] = false;
        emit DisallowToken(token);
    }

    /**
     * @notice Sets the game registry contract address
     * @param _gameRegistry The address of the new IGameRegistry implementation
     */
    function setGameRegistry(address _gameRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gameRegistry = IGameRegistry(_gameRegistry);
    }

    /**
     * @notice Creates a new marketplace order
     * @param token The NFT token address (ERC721 or ERC1155)
     * @param tokenId The ID of the token being sold
     * @param price The price for the order
     * @param amount The amount of tokens (for ERC1155)
     * @param paymentToken The payment token address (0x0 for ETH)
     * @param nameHash Hash of the game element name
     * @return orderId The ID of the newly created order
     */
    function createOrder(
        address token,
        uint256 tokenId,
        uint256 price,
        uint256 amount,
        address paymentToken,
        bytes32 nameHash
    )
        external
        returns (uint256 orderId)
    {
        orderId = orderNextId++;

        orders[orderId] = Order({
            maker: msg.sender,
            taker: address(0),
            token: token,
            tokenId: tokenId,
            paymentToken: paymentToken,
            amount: amount,
            status: OrderStatus.OPEN,
            nameHash: nameHash,
            price: price
        });

        emit CreateOrder(orderId, token, tokenId, price, amount);
    }

    /**
     * @notice Cancels an existing marketplace order
     * @param orderId The ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external isOwner(orderId) {
        orders[orderId].status = OrderStatus.CANCELED;
        emit CancelOrder(orderId);
    }

    /**
     * @notice Fills an existing marketplace order
     * @dev Handles both ETH and ERC20 token payments. Supports ERC721 and ERC1155 transfers
     * @param orderId The ID of the order to fill
     * @param paymentToken The token to use for payment (address(0) for ETH)
     */
    function fillOrder(uint256 orderId, address paymentToken, uint256 paymentTokenId) external payable nonReentrant {
        Order storage order = orders[orderId];
        if (orderId == 0 || orderId > orderNextId) {
            revert GameMarket_BadOrder();
        }
        if (msg.value > 0 && paymentToken != address(0)) {
            revert GameMarket_InvalidPaymentMethod();
        }
        if (order.status != OrderStatus.OPEN) {
            revert GameMarket_InvalidOrderState();
        }

        order.taker = msg.sender;
        order.status = OrderStatus.FILLED;

        uint256 price = order.price;
        uint256 tokenId = order.tokenId;
        uint256 amount = order.amount;
        address maker = order.maker;
        address token = order.token;

        emit OrderFilled(orderId, maker, msg.sender, token, tokenId, amount, order.nameHash);

        uint256 feeAmount = Math.mulDiv(price, fee, BASIS_POINTS_SCALE);
        uint256 totalPrice = price + feeAmount; // Price with fee included

        if (msg.value > 0) {
            if (totalPrice != msg.value) {
                revert GameMarket_InsufficientAmount();
            }

            // trasfer funds to token owners
            (bool success,) = payable(address(maker)).call{value: price}("");
            if (!success) {
                revert GameMarket_TransferFaild();
            }
        } else if (paymentToken != address(0)) {
            if (!whitelistedTokens[paymentToken]) {
                revert GameMarket_InvalidPaymentMethod();
            }

            if (paymentToken != address(0) && paymentTokenId > 0) {
                if (!IERC165(token).supportsInterface(type(IERC1155).interfaceId)) {
                    revert GameMarket_InvalidPaymentMethod();
                }
                IERC1155(paymentToken).safeTransferFrom({from: msg.sender, to: maker, id: paymentTokenId, value: price, data: bytes("")});
            } else {
                IERC20(paymentToken).safeTransferFrom(msg.sender, maker, price);
                IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), feeAmount);
            }
        } else {
            revert GameMarket_InvalidPaymentMethod();
        }

        // Transfer order token(s)
        if (IERC165(token).supportsInterface(type(IERC1155).interfaceId)) {
            IERC1155(token).safeTransferFrom({from: maker, to: msg.sender, id: tokenId, value: amount, data: bytes("")});
        } else {
            IERC721(token).safeTransferFrom({from: maker, to: msg.sender, tokenId: tokenId});
        }
    }

    /**
     * @notice Pauses an active marketplace order
     * @param orderId The ID of the order to pause
     */
    function pauseOrder(uint256 orderId) external isOwner(orderId) {
        orders[orderId].status = OrderStatus.PAUSED;
        emit PauseOrder(orderId);
    }

    /**
     * @notice Resumes a paused marketplace order
     * @param orderId The ID of the order to resume
     */
    function unpauseOrder(uint256 orderId) external isOwner(orderId) {
        if (orders[orderId].status != OrderStatus.PAUSED) {
            revert GameMarket_NotPausedOrder();
        }
        orders[orderId].status = OrderStatus.OPEN;
        emit UnpauseOrder(orderId);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Can only be called by addresses with DEFAULT_ADMIN_ROLE. This is required by UUPS proxy pattern
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /*//////////////////////////////////////////////////////////////
                        INTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Verifies that the caller is the order maker
     * @param orderId The ID of the order to check
     */
    function _isOrderOwner(uint256 orderId) internal view {
        if (orders[orderId].maker != msg.sender) {
            revert GameMarket_NotOwner();
        }
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice Retrieves a list of game elements by type from the registry
     * @param elementType The type of game element to retrieve
     * @return Array of element names
     */
    function getGameElementsList(uint8 elementType) external view returns (string[] memory) {
        if (elementType == uint8(IGameRegistry.GameElementType.UNIQUE_ITEM)) {
            return gameRegistry.getUniqueItemsList();
        }

        if (elementType == uint8(IGameRegistry.GameElementType.COIN)) {
            return gameRegistry.getGameCoinsList();
        }

        if (elementType == uint8(IGameRegistry.GameElementType.RESOURCE)) {
            return gameRegistry.getResourcesList();
        }

        if (elementType == uint8(IGameRegistry.GameElementType.CHARACTER)) {
            return gameRegistry.getCharactersList();
        }
        return new string[](0);
    }

    /**
     * @notice Retrieves game element details by name
     * @param name The name of the game element to retrieve
     * @return GameElementStruct containing the element details
     */
    function getGameElementName(string calldata name) external view returns (IGameRegistry.GameElementStruct memory) {
        return gameRegistry.getGameElementName(name);
    }

    /**
     * @notice Retrieves game element details by hash
     * @param resourceHash The hash of the game element to retrieve
     * @return GameElementStruct containing the element details
     */
    function getGameElementHash(bytes32 resourceHash) external view returns (IGameRegistry.GameElementStruct memory) {
        return gameRegistry.getGameElementHash(resourceHash);
    }

    /**
     * @notice Returns the current protocol fee
     * @return The protocol fee in basis points
     */
    function getProtocolFee() external view returns (uint256) {
        return fee;
    }

    /**
     * @notice Checks if a token is whitelisted for use in the marketplace
     * @param token The token address to check
     * @return True if the token is whitelisted, false otherwise
     */
    function checkTokenIsAllowed(address token) external view returns (bool) {
        return whitelistedTokens[token];
    }

    function getGameRegistry() external view returns (address) {
        return address(gameRegistry);
    }

    function previewTotalPrice(uint256 price) public view returns (uint256 totalPrice) {
        uint256 feeAmount = Math.mulDiv(price, fee, BASIS_POINTS_SCALE);
        totalPrice = price + feeAmount; // Price with fee included
    }
}

// Layout of Contract:
// version
// imports
// interfaces, libraries, contracts
// errors
// Type declarations
// State variables
// Events
// Modifiers
// Functions

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private
// internal & private view & pure functions
// external & public view & pure functions

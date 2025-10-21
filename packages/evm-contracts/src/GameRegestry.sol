// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "";
import {AccessControle} from "";

/**
 * @title Game Regestry
 * @author Alexander Scherbatyuk
 * @notice Main game regestry contract, that consist of all game on-chain resources.
 */
contract GameRegestry is Ownable, AccessControle { // Ownable, Controll Access (Owner access is limited to revoke / grant ADMIN_ROLE)

    // Arrays

    /// @dev these arrays are for future integration with GameMarket, since Market would not have any other source for game items details
    string[] internal s_coins; // coins names that are available within the game
    string[] internal s_resources; // resource names that are available within the game
    string[] internal s_characters; // characters types that are available within the game
    string[] internal s_uiniqueItems; // uinique items names that are available within the game


    // Structs

    /// @dev default uinified struct for any type of a game element
    struct gameElement {
        address token;
        uint256 tokenId;
        bool useId;
    }

    // Constants

    /// @dev for integration with Market contract
    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");


    constructor(string[] memory _coins, string[] memory _resources, string[] memory _characters, string[] memory _uiniqueItems){
        s_coins = _coins;
        s_resources = _resources;
        s_characters = _characters;
        s_uiniqueItems = _uiniqueItems;
    }

    modifier onlyManagerRole() {
        _;
    }

    modifier onlyManagerOrMarketRole() {
        _;
    }


    /*//////////////////////////////////////////////////////////////
                         PUBLIC VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/


    /*//////////////////////////////////////////////////////////////
                        EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getGameCoinsList() external view returns(string[] memory) {
        return s_coins;
    }

    function getResourcesList() external view returns(string[] memory) {
        return s_resources;
    }

    function getCharactersList() external view returns(string[] memory) {
        return s_characters;
    }
    
    function getUniqueItemsList() external view returns(string[] memory) {
        return s_uiniqueItems;
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

// CEI:
// Check
// Effect
// Interaction
// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {GameRegestry} from "src/GameRegestry.sol";
import {WBResources} from "src/tokens/ERC1155/WBResources.sol";
import {WBCoin} from "src/tokens/ERC20/WBCoin.sol";
import {WBCharacter} from "src/tokens/ERC721/WBCharacter.sol";
import {DeployGameRegestry} from "script/DeployGameRegestry.s.sol";
import {DeployWBResources} from "script/DeployWBResources.s.sol";
import {DeployWBCoin} from "script/DeployWBCoin.s.sol";
import {DeployWBCharacter} from "script/DeployWBCharacter.s.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract GameRegestryIntTest is Test {
    event CommitResources(bytes indexed commit);
    event CommitBatch(uint256 indexed nonce, bytes[] indexed commits);
    event RevokeAdminRole(address indexed account);
    event GrantAdminRole(address indexed account);
    event CommitConfirmed(bytes indexed commit);
    event CommitRejected(bytes indexed commit);
    event AddGameElement(bytes32 indexed nameHash, address indexed tokenAddress, uint256 indexed tokenId, bool requiresTokenId);
    event RemoveGameElement(bytes32 indexed nameHash);

    GameRegestry public gameRegestry;
    WBResources public wbResources;
    WBCoin public wBCoin;
    WBCharacter public wbCharacter;

    bytes32 private constant GAME_SIGNER_ROLE = keccak256("GAME_SIGNER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    string public constant TOKEN_URI = "ipfs://QmToken1";

    address public GAME_SIGNER;
    address public ADMIN;
    address public PLAYER = makeAddr("PLAYER");

    uint256 public GAME_SIGNER_PRIV_KEY;

    function setUp() public {
        ADMIN = msg.sender;
        (GAME_SIGNER, GAME_SIGNER_PRIV_KEY) = makeAddrAndKey("GAME_SIGNER");

        address wbResourcesAddress = new DeployWBResources().deploy();
        wbResources = WBResources(wbResourcesAddress);

        address gameRegestryAddress = new DeployGameRegestry().deploy();
        gameRegestry = GameRegestry(gameRegestryAddress);

        // renounce admin as GAME_SIGNER_ROLE for propper tessting
        gameRegestry.renounceRole(GAME_SIGNER_ROLE, address(this));

        ADMIN = msg.sender;

        vm.prank(ADMIN);
        gameRegestry.grantRole(GAME_SIGNER_ROLE, GAME_SIGNER);

        wBCoin = WBCoin(new DeployWBCoin().deploy());
        wBCoin.grantRole(MINTER_ROLE, gameRegestryAddress);
        wBCoin.grantRole(MINTER_ROLE, GAME_SIGNER);

        wbResources = WBResources(new DeployWBResources().deploy());
        wbResources.grantRole(MINTER_ROLE, gameRegestryAddress);
        wbResources.grantRole(MINTER_ROLE, GAME_SIGNER);

        wbCharacter = WBCharacter(new DeployWBCharacter().deploy());
        wbCharacter.grantRole(MINTER_ROLE, gameRegestryAddress);
        wbCharacter.grantRole(MINTER_ROLE, GAME_SIGNER);
    }

    modifier addCoinResourceType() {
        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement(GameRegestry.GameElementType.COIN, "WBCoin", address(wBCoin), 0, false);
        _;
    }

    modifier addResourceType() {
        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement(GameRegestry.GameElementType.RESOURCE, "Wood", address(wbResources), 1, true);
        _;
    }

    modifier addCharacterType() {
        vm.prank(GAME_SIGNER);
        gameRegestry.addGameElement(GameRegestry.GameElementType.CHARACTER, "Wizard", address(wbCharacter), 0, false);
        _;
    }

    function test_wbCoinGameSignerAndGameRegestryHaveMinterRoles() public view {
        assertTrue(wBCoin.hasRole(MINTER_ROLE, GAME_SIGNER), "GAME_SIGNER should have MINTER_ROLE on WBCoin");
        assertTrue(wBCoin.hasRole(MINTER_ROLE, address(gameRegestry)), "GameRegestry should have MINTER_ROLE on WBCoin");
    }

    function test_mintWBCoinsToPlayer() public addCoinResourceType {
        // vm.assume(player != address(0));
        // vm.assume(amount > 0 && amount < 1e24);

        console.log("Minting WBCoins to player:", PLAYER);
        console.log("Game signer:", GAME_SIGNER);
        uint256 amount = 1000 ether;

        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", PLAYER, amount);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage("WBCoin", address(wBCoin), 0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        uint256 playerWBCoinBalance = wBCoin.balanceOf(PLAYER);
        assertEq(playerWBCoinBalance, amount);

        console.log("WBCoin total supply:", wBCoin.totalSupply());
        console.log("PLAYER's WBCoin balance:", playerWBCoinBalance);
    }

    function test_mintWBResourceToPlayer() public addResourceType {
        // vm.assume(player != address(0));
        // vm.assume(amount > 0 && amount < 1e24);

        console.log("Minting wood to player:", PLAYER);
        console.log("Game signer:", GAME_SIGNER);
        uint256 amount = 1000;

        bytes memory callData = abi.encodeWithSignature("mint(address,uint256,uint256,bytes)", PLAYER, 1, amount, "");
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage("Wood", address(wbResources), 0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        uint256 playerWBCResourcelance = wbResources.balanceOf(PLAYER, 1);
        assertEq(playerWBCResourcelance, amount);

        console.log("WBResources total supply:", wbResources.totalSupply(1));
        console.log("PLAYER's WBResources balance:", playerWBCResourcelance);
    }

    function test_mintWBCharacterToPlayer() public addCharacterType {
        // vm.assume(player != address(0));
        // vm.assume(amount > 0 && amount < 1e24);

        console.log("Minting wizard to player:", PLAYER);
        console.log("Game signer:", GAME_SIGNER);

        bytes memory callData = abi.encodeWithSignature("mint(address)", PLAYER);
        (bytes32 resourceHash, bytes memory commit, bytes memory signature) = getSignedMessage("Wizard", address(wbCharacter), 0, callData);

        vm.expectEmit(true, false, false, true);
        emit CommitConfirmed(callData);
        gameRegestry.commitResource({resourceHash: resourceHash, commit: commit, signature: signature});

        uint256 playerWBCCharacterBalance = wbCharacter.balanceOf(PLAYER);
        assertEq(playerWBCCharacterBalance, 1);

        console.log("WBCharacter total supply:", wbCharacter.totalSupply());
        console.log("PLAYER's WBCharacter balance:", playerWBCCharacterBalance);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getMessageHash(address target, address account, address signer, uint256 nonce, bytes memory callData) public view returns (bytes32 digest) {
        bytes32 MESSAGE_TYPEHASH = keccak256("CommitStruct(address target,address account,address signer,uint256 nonce,bytes callData)");

        bytes32 TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

        bytes32 _hashedName = keccak256(bytes("GameRegestry"));
        bytes32 _hashedVersion = keccak256(bytes("1"));

        bytes32 hashStruct = keccak256(
            abi.encode(MESSAGE_TYPEHASH, GameRegestry.CommitStruct({target: target, account: account, signer: signer, nonce: nonce, callData: callData}))
        );

        bytes32 domainSeparatorV4 = keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(gameRegestry)));
        return MessageHashUtils.toTypedDataHash(domainSeparatorV4, hashStruct);
    }

    function getSignedMessage(
        string memory elementName,
        address target,
        uint256 nonce,
        bytes memory callData
    )
        public
        view
        returns (bytes32, bytes memory, bytes memory)
    {
        bytes32 resourceHash = keccak256(bytes(elementName));

        address account = PLAYER;
        address signer = GAME_SIGNER;

        bytes memory commit = abi.encode(target, account, signer, nonce, callData);

        bytes32 digest = getMessageHash(target, account, signer, nonce, callData);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(GAME_SIGNER_PRIV_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        return (resourceHash, commit, signature);
    }
}
